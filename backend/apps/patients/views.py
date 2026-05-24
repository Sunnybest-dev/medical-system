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


class PatientProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = PatientProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsPatient]

    def get_object(self):
        profile, _ = PatientProfile.objects.get_or_create(user=self.request.user)
        return profile


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
