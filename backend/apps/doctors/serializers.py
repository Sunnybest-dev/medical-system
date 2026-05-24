from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import DoctorProfile, DoctorDocument, DoctorAvailability, DoctorVacation, DoctorRating, Specialization


class SpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialization
        fields = '__all__'


class DoctorDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorDocument
        fields = '__all__'
        read_only_fields = ['id', 'doctor', 'uploaded_at']


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorAvailability
        fields = '__all__'
        read_only_fields = ['id', 'doctor']


class DoctorVacationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorVacation
        fields = '__all__'
        read_only_fields = ['id', 'doctor']


class DoctorRatingSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = DoctorRating
        fields = '__all__'
        read_only_fields = ['id', 'doctor', 'patient', 'created_at']


class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    specialization = SpecializationSerializer(read_only=True)
    specialization_id = serializers.UUIDField(write_only=True, required=False)
    availability = DoctorAvailabilitySerializer(many=True, read_only=True)

    class Meta:
        model = DoctorProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'verification_status', 'average_rating',
                            'total_consultations', 'total_earnings', 'created_at', 'updated_at']


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DoctorProfile
        fields = ['specialization', 'medical_license_number', 'medical_council_registration',
                  'years_of_experience', 'consultation_fee', 'languages_spoken', 'bio', 'education']


class DoctorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for doctor search/listing"""
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    avatar = serializers.CharField(source='user.avatar', read_only=True)
    country = serializers.CharField(source='user.country', read_only=True)
    specialization_name = serializers.CharField(source='specialization.name', read_only=True)

    class Meta:
        model = DoctorProfile
        fields = ['id', 'full_name', 'avatar', 'country', 'specialization_name',
                  'years_of_experience', 'consultation_fee', 'languages_spoken',
                  'average_rating', 'total_consultations', 'online_status']
