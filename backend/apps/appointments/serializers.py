from rest_framework import serializers
from .models import Appointment, ConsultationNote
from apps.doctors.serializers import DoctorListSerializer
from apps.users.serializers import UserSerializer


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_name = serializers.CharField(source='doctor.user.full_name', read_only=True)
    doctor_specialization = serializers.CharField(source='doctor.specialization.name', read_only=True)

    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['id', 'patient', 'jitsi_room_name', 'created_at', 'updated_at']


class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = ['doctor', 'scheduled_at', 'duration_minutes', 'chief_complaint', 'ai_assessment_id']

    def validate_doctor(self, doctor):
        if not doctor.is_approved:
            raise serializers.ValidationError('This doctor is not available for consultations.')
        # Block booking if doctor has not completed their profile
        if not doctor.specialization or not doctor.consultation_fee or doctor.consultation_fee <= 0:
            raise serializers.ValidationError('This doctor has not completed their profile yet.')
        return doctor

    def validate_scheduled_at(self, value):
        from django.utils import timezone
        if value <= timezone.now():
            raise serializers.ValidationError('Appointment must be scheduled in the future.')
        return value


class ConsultationNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultationNote
        fields = '__all__'
        read_only_fields = ['id', 'doctor', 'disclaimer', 'created_at', 'updated_at']
