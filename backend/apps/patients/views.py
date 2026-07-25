from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
import cloudinary.uploader
from .models import PatientProfile, MedicalDocument
from .serializers import PatientProfileSerializer, MedicalDocumentSerializer
from apps.users.models import User


class IsPatient(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.Role.PATIENT


class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.Role.DOCTOR


class PatientProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_object(self):
        profile, _ = PatientProfile.objects.get_or_create(user=self.request.user)
        return profile


class DoctorPatientDetailView(APIView):
    """Doctor-facing: full patient details — profile, documents, AI assessments."""
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get(self, request, patient_id):
        from apps.appointments.models import Appointment
        from apps.ai_engine.models import AIAssessment
        from apps.ai_engine.serializers import AIAssessmentSerializer
        from apps.users.serializers import UserSerializer

        # Verify the doctor has had an appointment with this patient
        has_appointment = Appointment.objects.filter(
            doctor__user=request.user,
            patient_id=patient_id,
        ).exists()
        if not has_appointment:
            return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            patient_user = User.objects.get(id=patient_id)
        except User.DoesNotExist:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        profile, _ = PatientProfile.objects.get_or_create(user=patient_user)
        documents = MedicalDocument.objects.filter(patient=profile)
        assessments = AIAssessment.objects.filter(patient=patient_user).prefetch_related('symptoms')

        return Response({
            'user': UserSerializer(patient_user).data,
            'profile': PatientProfileSerializer(profile).data,
            'documents': MedicalDocumentSerializer(documents, many=True).data,
            'assessments': AIAssessmentSerializer(assessments, many=True).data,
        })


class MedicalDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = MedicalDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return MedicalDocument.objects.filter(patient__user=self.request.user)

    def perform_create(self, serializer):
        profile, _ = PatientProfile.objects.get_or_create(user=self.request.user)
        serializer.save(patient=profile)


class MedicalDocumentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPatient]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type. Allowed: JPEG, PNG, PDF.'}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > 10 * 1024 * 1024:  # 10MB
            return Response({'error': 'File too large. Max 10MB.'}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(
            file,
            folder='mediai/documents',
            resource_type='auto'
        )
        return Response({'url': result['secure_url'], 'public_id': result['public_id']})


class MedicalDocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class = MedicalDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_queryset(self):
        return MedicalDocument.objects.filter(patient__user=self.request.user)
