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
    image = serializers.ImageField(write_only=True, required=False)

    class Meta:
        model = DoctorRating
        fields = '__all__'
        read_only_fields = ['id', 'doctor', 'patient', 'created_at']

    def validate(self, attrs):
        if not attrs.get('review') and not attrs.get('image'):
            raise serializers.ValidationError('Provide at least a review text or an image.')
        return attrs


class DoctorProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    specialization = SpecializationSerializer(read_only=True)
    specialization_id = serializers.UUIDField(write_only=True, required=False)
    availability = DoctorAvailabilitySerializer(many=True, read_only=True)
    documents = DoctorDocumentSerializer(many=True, read_only=True)

    class Meta:
        model = DoctorProfile
        fields = '__all__'
        read_only_fields = ['id', 'user', 'verification_status', 'average_rating',
                            'total_consultations', 'total_earnings', 'created_at', 'updated_at']


class DoctorProfileUpdateSerializer(serializers.ModelSerializer):
    specialization_id = serializers.UUIDField(required=False, allow_null=True)
    specialization_other = serializers.CharField(required=False, allow_blank=True, max_length=100, write_only=True)

    class Meta:
        model = DoctorProfile
        fields = ['specialization_id', 'specialization_other', 'medical_license_number', 'medical_council_registration',
                  'years_of_experience', 'consultation_fee', 'languages_spoken', 'bio', 'education']

    def validate_specialization_id(self, value):
        if value:
            try:
                Specialization.objects.get(id=value)
            except Specialization.DoesNotExist:
                raise serializers.ValidationError('Specialization not found.')
        return value

    def update(self, instance, validated_data):
        spec_other = validated_data.pop('specialization_other', None)
        spec_id = validated_data.pop('specialization_id', None)
        if spec_other:
            spec, _ = Specialization.objects.get_or_create(name=spec_other.strip())
            instance.specialization = spec
        elif spec_id:
            instance.specialization = Specialization.objects.get(id=spec_id)
        return super().update(instance, validated_data)


class DoctorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for doctor search/listing"""
    user = serializers.SerializerMethodField()
    specialization = serializers.SerializerMethodField()

    class Meta:
        model = DoctorProfile
        fields = ['id', 'user', 'specialization',
                  'years_of_experience', 'consultation_fee', 'languages_spoken',
                  'average_rating', 'total_consultations', 'online_status']

    def get_user(self, obj):
        return {
            'id': str(obj.user.id),
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'avatar': obj.user.avatar,
            'country': obj.user.country,
            'full_name': obj.user.full_name,
        }

    def get_specialization(self, obj):
        if obj.specialization:
            return {'id': str(obj.specialization.id), 'name': obj.specialization.name}
        return None
