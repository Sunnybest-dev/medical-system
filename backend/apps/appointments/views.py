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
    """Generate Jitsi Meet JWT token for secure room access"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        try:
            appointment = Appointment.objects.get(
                pk=pk,
                status__in=['confirmed', 'pending']
            )
            if request.user != appointment.patient and request.user != appointment.doctor.user:
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'room_name': appointment.jitsi_room_name,
            'domain': 'meet.jit.si',
            'user_info': {
                'displayName': request.user.full_name,
                'email': request.user.email,
                'avatar': request.user.avatar,
            }
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
