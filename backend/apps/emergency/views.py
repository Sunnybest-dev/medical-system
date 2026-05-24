from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import EmergencyRequest
from .serializers import EmergencyRequestSerializer, EmergencyCreateSerializer
from apps.doctors.models import DoctorProfile
from apps.appointments.models import Appointment
from apps.notifications.tasks import send_emergency_notification


class CreateEmergencyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = EmergencyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        emergency = EmergencyRequest.objects.create(
            patient=request.user,
            **serializer.validated_data
        )

        # Find available emergency-duty doctors
        emergency_doctors = DoctorProfile.objects.filter(
            online_status=DoctorProfile.OnlineStatus.EMERGENCY_DUTY,
            verification_status=DoctorProfile.VerificationStatus.APPROVED
        ).order_by('?')  # Random selection

        response_data = {
            'emergency': EmergencyRequestSerializer(emergency).data,
            'message': 'Emergency request created. Finding available doctors...',
            'emergency_services_reminder': 'Please also call your local emergency services (911/999/112) immediately.',
        }

        if emergency.emergency_type == EmergencyRequest.EmergencyType.CHILDBIRTH:
            response_data['special_notice'] = EmergencyRequest.CHILDBIRTH_DISCLAIMER

        if emergency_doctors.exists():
            doctor = emergency_doctors.first()
            appointment = Appointment.objects.create(
                patient=request.user,
                doctor=doctor,
                appointment_type=Appointment.AppointmentType.EMERGENCY,
                status=Appointment.Status.CONFIRMED,
                scheduled_at=timezone.now(),
                chief_complaint=f"EMERGENCY: {emergency.get_emergency_type_display()}",
            )
            emergency.assigned_doctor = doctor
            emergency.appointment = appointment
            emergency.status = EmergencyRequest.Status.ASSIGNED
            emergency.jitsi_room_name = appointment.jitsi_room_name
            emergency.save()

            send_emergency_notification.delay(str(emergency.id))

            response_data.update({
                'doctor_assigned': True,
                'doctor_name': f"Dr. {doctor.user.full_name}",
                'jitsi_room': appointment.jitsi_room_name,
                'appointment_id': str(appointment.id),
            })
        else:
            response_data.update({
                'doctor_assigned': False,
                'message': 'No emergency-duty doctors available right now. Please call emergency services immediately.',
            })

        return Response(response_data, status=status.HTTP_201_CREATED)


class EmergencyListView(generics.ListAPIView):
    serializer_class = EmergencyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        from apps.users.models import User
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return EmergencyRequest.objects.filter(patient=user)
        elif user.role == User.Role.DOCTOR:
            return EmergencyRequest.objects.filter(assigned_doctor__user=user)
        return EmergencyRequest.objects.all()


class EmergencyDetailView(generics.RetrieveAPIView):
    serializer_class = EmergencyRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = EmergencyRequest.objects.all()
