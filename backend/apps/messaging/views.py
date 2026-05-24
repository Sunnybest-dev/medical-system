from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.appointments.models import Appointment
from apps.users.models import User


def can_message(patient, doctor_profile):
    """Check if patient and doctor have an existing appointment or consultation"""
    return Appointment.objects.filter(
        patient=patient,
        doctor=doctor_profile,
        status__in=['confirmed', 'completed', 'pending']
    ).exists()


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.PATIENT:
            return Conversation.objects.filter(patient=user, is_active=True)
        elif user.role == User.Role.DOCTOR:
            return Conversation.objects.filter(doctor__user=user, is_active=True)
        return Conversation.objects.none()


class ConversationCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from apps.doctors.models import DoctorProfile
        doctor_id = request.data.get('doctor_id')
        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not can_message(request.user, doctor):
            return Response(
                {'error': 'You can only message doctors you have an appointment with.'},
                status=status.HTTP_403_FORBIDDEN
            )

        conversation, created = Conversation.objects.get_or_create(
            patient=request.user, doctor=doctor
        )
        return Response(ConversationSerializer(conversation, context={'request': request}).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        user = self.request.user
        try:
            if user.role == User.Role.PATIENT:
                conv = Conversation.objects.get(id=conversation_id, patient=user)
            else:
                conv = Conversation.objects.get(id=conversation_id, doctor__user=user)
            # Mark messages as read
            conv.messages.filter(is_read=False).exclude(sender=user).update(is_read=True)
            return conv.messages.all()
        except Conversation.DoesNotExist:
            return Message.objects.none()
