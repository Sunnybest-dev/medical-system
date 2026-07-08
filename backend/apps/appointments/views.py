from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Appointment, ConsultationNote
from .serializers import AppointmentSerializer, AppointmentCreateSerializer, ConsultationNoteSerializer
from apps.users.models import User
from apps.notifications.tasks import send_appointment_notification


class AppointmentListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AppointmentCreateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Appointment.objects.filter(patient=user).select_related('doctor__user', 'doctor__specialization')
        elif user.role == User.Role.DOCTOR:
            return Appointment.objects.filter(doctor__user=user).select_related('patient', 'doctor__specialization')
        return Appointment.objects.none()

    def perform_create(self, serializer):
        appointment = serializer.save(patient=self.request.user)
        send_appointment_notification.delay(str(appointment.id), 'created')


class AppointmentDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Appointment.objects.filter(patient=user)
        elif user.role == User.Role.DOCTOR:
            return Appointment.objects.filter(doctor__user=user)
        return Appointment.objects.all()


class AppointmentStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            if request.user.role == User.Role.DOCTOR:
                appointment = Appointment.objects.get(pk=pk, doctor__user=request.user)
            else:
                appointment = Appointment.objects.get(pk=pk, patient=request.user)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get('status')
        valid_transitions = {
            User.Role.DOCTOR: ['confirmed', 'completed', 'cancelled'],
            User.Role.PATIENT: ['cancelled'],
        }

        if new_status not in valid_transitions.get(request.user.role, []):
            return Response({'error': 'Invalid status transition.'}, status=status.HTTP_400_BAD_REQUEST)

        appointment.status = new_status
        if new_status == 'cancelled':
            appointment.cancellation_reason = request.data.get('reason', '')
            appointment.cancelled_by = request.user
        appointment.save()
        send_appointment_notification.delay(str(appointment.id), new_status)
        return Response(AppointmentSerializer(appointment).data)


class JitsiTokenView(APIView):
    """Generate a signed Jitsi JWT for secure video consultation"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            appointment = Appointment.objects.select_related(
                'patient', 'doctor__user'
            ).get(pk=pk)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        if request.user != appointment.patient and request.user != appointment.doctor.user:
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        if appointment.status != 'confirmed':
            return Response(
                {'error': 'Appointment must be confirmed before joining the video call.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Allow joining within 15 minutes before and 60 minutes after scheduled time
        from datetime import timedelta
        now = timezone.now()
        window_start = appointment.scheduled_at - timedelta(minutes=15)
        window_end = appointment.scheduled_at + timedelta(minutes=appointment.duration_minutes + 60)
        if not (window_start <= now <= window_end):
            return Response(
                {'error': f'Video call is only available from 15 minutes before the scheduled time ({appointment.scheduled_at.strftime("%Y-%m-%d %H:%M UTC")}).'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Ensure room name exists
        if not appointment.jitsi_room_name:
            appointment.jitsi_room_name = f'mediai-{appointment.id}'
            appointment.save(update_fields=['jitsi_room_name'])

        app_id = settings.JITSI_APP_ID
        secret = settings.JITSI_SECRET
        is_doctor = request.user == appointment.doctor.user

        # Build JWT — fall back to no token if secret not configured
        token = None
        if secret:
            import jwt as pyjwt
            from datetime import timedelta
            now = timezone.now()
            payload = {
                'iss': app_id,
                'sub': 'meet.jit.si',
                'aud': 'jitsi',
                'iat': int(now.timestamp()),
                'exp': int((now + timedelta(hours=2)).timestamp()),
                'room': appointment.jitsi_room_name,
                'context': {
                    'user': {
                        'id': str(request.user.id),
                        'name': request.user.full_name,
                        'email': request.user.email,
                        'avatar': getattr(request.user, 'avatar', '') or '',
                        'moderator': is_doctor,
                    },
                    'features': {
                        'livestreaming': False,
                        'recording': False,
                        'outbound-call': False,
                    },
                },
            }
            token = pyjwt.encode(payload, secret, algorithm='HS256')

        return Response({
            'room_name': appointment.jitsi_room_name,
            'domain': 'meet.jit.si',
            'token': token,
            'user_info': {
                'displayName': request.user.full_name,
                'email': request.user.email,
                'avatar': getattr(request.user, 'avatar', '') or '',
                'moderator': is_doctor,
            },
        })


class ConsultationNoteView(generics.ListCreateAPIView):
    serializer_class = ConsultationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR:
            return ConsultationNote.objects.filter(doctor__user=user)
        return ConsultationNote.objects.filter(
            appointment__patient=user, is_shared_with_patient=True
        )

    def perform_create(self, serializer):
        appointment = Appointment.objects.get(
            id=self.request.data.get('appointment'),
            doctor__user=self.request.user
        )
        serializer.save(doctor=appointment.doctor, appointment=appointment)


class ConsultationNoteDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = ConsultationNoteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.DOCTOR:
            return ConsultationNote.objects.filter(doctor__user=user)
        return ConsultationNote.objects.filter(appointment__patient=user, is_shared_with_patient=True)


class TodayAppointmentsView(generics.ListAPIView):
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        today = timezone.now().date()
        if self.request.user.role == User.Role.DOCTOR:
            return Appointment.objects.filter(
                doctor__user=self.request.user,
                scheduled_at__date=today,
                status__in=['pending', 'confirmed']
            )
        return Appointment.objects.filter(
            patient=self.request.user,
            scheduled_at__date=today
        )
