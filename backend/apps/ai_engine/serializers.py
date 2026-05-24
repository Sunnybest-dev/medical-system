from rest_framework import serializers
from .models import Symptom, AIAssessment


class SymptomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Symptom
        fields = '__all__'


class AIAssessmentSerializer(serializers.ModelSerializer):
    symptoms_list = SymptomSerializer(source='symptoms', many=True, read_only=True)

    class Meta:
        model = AIAssessment
        fields = '__all__'
        read_only_fields = ['id', 'patient', 'created_at', 'disclaimer']


class FollowupQuestionsSerializer(serializers.Serializer):
    symptoms = serializers.ListField(child=serializers.CharField(), min_length=1)


class AssessmentRequestSerializer(serializers.Serializer):
    symptom_ids = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    symptom_names = serializers.ListField(child=serializers.CharField(), required=False, default=list)
    followup_answers = serializers.DictField(child=serializers.CharField(), required=False, default=dict)


class MedicationInfoSerializer(serializers.Serializer):
    medication_name = serializers.CharField(max_length=200)
