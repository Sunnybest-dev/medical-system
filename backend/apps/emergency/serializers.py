from rest_framework import serializers
from .models import EmergencyRequest


class EmergencyRequestSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_name = serializers.CharField(source='assigned_doctor.user.full_name', read_only=True)

    class Meta:
        model = EmergencyRequest
        fields = '__all__'
        read_only_fields = ['id', 'patient', 'status', 'assigned_doctor', 'appointment',
                            'jitsi_room_name', 'created_at', 'resolved_at']


class EmergencyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyRequest
        fields = ['emergency_type', 'description', 'location']
