from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import UserRateThrottle
from .models import Symptom, AIAssessment
from .serializers import (
    SymptomSerializer, AIAssessmentSerializer,
    FollowupQuestionsSerializer, AssessmentRequestSerializer, MedicationInfoSerializer
)
from .services import HealthAssessmentService
from apps.patients.models import PatientProfile


class AIRateThrottle(UserRateThrottle):
    scope = 'ai_assessment'


class SymptomListView(generics.ListAPIView):
    queryset = Symptom.objects.all()
    serializer_class = SymptomSerializer
    permission_classes = [permissions.IsAuthenticated]


class FollowupQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        serializer = FollowupQuestionsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = HealthAssessmentService()
        questions = service.get_followup_questions(serializer.validated_data['symptoms'])
        return Response({'questions': questions})


class PerformAssessmentView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        serializer = AssessmentRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        symptoms = Symptom.objects.filter(id__in=serializer.validated_data['symptom_ids'])
        if not symptoms.exists():
            return Response({'error': 'No valid symptoms found.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get patient context
        patient_info = {}
        try:
            profile = PatientProfile.objects.get(user=request.user)
            from datetime import date
            age = None
            if request.user.date_of_birth:
                age = (date.today() - request.user.date_of_birth).days // 365
            patient_info = {
                'age': age,
                'gender': request.user.gender,
                'existing_conditions': profile.existing_conditions,
                'current_medications': profile.current_medications,
                'allergies': profile.allergies,
            }
        except PatientProfile.DoesNotExist:
            pass

        service = HealthAssessmentService()
        symptom_names = list(symptoms.values_list('name', flat=True))
        result = service.perform_assessment(
            symptom_names,
            serializer.validated_data['followup_answers'],
            patient_info
        )

        assessment = AIAssessment.objects.create(
            patient=request.user,
            severity_level=result.get('severity_level', 'yellow'),
            possible_conditions=result.get('possible_conditions', []),
            suggested_specialist=result.get('suggested_specialist', ''),
            medication_info=result.get('medication_info', []),
            recommendations=result.get('recommendations', ''),
            symptom_details=serializer.validated_data['followup_answers'],
            ai_raw_response=str(result),
        )
        assessment.symptoms.set(symptoms)

        return Response({
            'assessment': AIAssessmentSerializer(assessment).data,
            'result': result,
        })


class AssessmentHistoryView(generics.ListAPIView):
    serializer_class = AIAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AIAssessment.objects.filter(patient=self.request.user)


class AssessmentDetailView(generics.RetrieveAPIView):
    serializer_class = AIAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AIAssessment.objects.filter(patient=self.request.user)


class MedicationInfoView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIRateThrottle]

    def post(self, request):
        serializer = MedicationInfoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = HealthAssessmentService()
        info = service.get_medication_info(serializer.validated_data['medication_name'])
        return Response(info)
