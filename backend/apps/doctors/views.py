from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
import cloudinary.uploader
from .models import DoctorProfile, DoctorDocument, DoctorAvailability, DoctorVacation, DoctorRating, Specialization
from .serializers import (
    DoctorProfileSerializer, DoctorProfileUpdateSerializer, DoctorListSerializer,
    DoctorDocumentSerializer, DoctorAvailabilitySerializer, DoctorVacationSerializer,
    DoctorRatingSerializer, SpecializationSerializer
)
from apps.users.models import User


class IsDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.Role.DOCTOR


class IsApprovedDoctor(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user.role == User.Role.DOCTOR and
                hasattr(request.user, 'doctor_profile') and
                request.user.doctor_profile.is_approved)


class SpecializationListView(generics.ListAPIView):
    queryset = Specialization.objects.all()
    serializer_class = SpecializationSerializer
    permission_classes = [permissions.AllowAny]


class DoctorListView(generics.ListAPIView):
    serializer_class = DoctorListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['specialization', 'online_status']
    search_fields = ['user__first_name', 'user__last_name', 'user__country', 'languages_spoken']
    ordering_fields = ['average_rating', 'consultation_fee', 'years_of_experience']

    def get_queryset(self):
        qs = DoctorProfile.objects.filter(
            verification_status=DoctorProfile.VerificationStatus.APPROVED
        ).select_related('user', 'specialization')

        country = self.request.query_params.get('country')
        language = self.request.query_params.get('language')
        min_rating = self.request.query_params.get('min_rating')

        if country:
            qs = qs.filter(user__country__icontains=country)
        if language:
            qs = qs.filter(languages_spoken__contains=[language])
        if min_rating:
            qs = qs.filter(average_rating__gte=min_rating)
        return qs


class DoctorDetailView(generics.RetrieveAPIView):
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.AllowAny]
    queryset = DoctorProfile.objects.filter(
        verification_status=DoctorProfile.VerificationStatus.APPROVED
    ).select_related('user', 'specialization')


class DoctorProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return DoctorProfileUpdateSerializer
        return DoctorProfileSerializer

    def get_object(self):
        profile, _ = DoctorProfile.objects.get_or_create(
            user=self.request.user,
            defaults={'medical_license_number': f'TEMP-{self.request.user.id}'}
        )
        return profile


class DoctorDocumentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsDoctor]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file = request.FILES.get('file')
        document_type = request.data.get('document_type')

        if not file or not document_type:
            return Response({'error': 'File and document_type are required.'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = ['image/jpeg', 'image/png', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({'error': 'Invalid file type.'}, status=status.HTTP_400_BAD_REQUEST)

        result = cloudinary.uploader.upload(file, folder='mediai/doctor-docs', resource_type='auto')
        profile, _ = DoctorProfile.objects.get_or_create(user=request.user)
        doc = DoctorDocument.objects.create(
            doctor=profile,
            document_type=document_type,
            file_url=result['secure_url']
        )
        return Response(DoctorDocumentSerializer(doc).data, status=status.HTTP_201_CREATED)


class DoctorAvailabilityView(generics.ListCreateAPIView):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor__user=self.request.user)

    def perform_create(self, serializer):
        profile, _ = DoctorProfile.objects.get_or_create(user=self.request.user)
        serializer.save(doctor=profile)


class DoctorAvailabilityDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DoctorAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return DoctorAvailability.objects.filter(doctor__user=self.request.user)


class DoctorStatusUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsApprovedDoctor]

    def patch(self, request):
        status_value = request.data.get('status')
        valid_statuses = [s[0] for s in DoctorProfile.OnlineStatus.choices]
        if status_value not in valid_statuses:
            return Response({'error': 'Invalid status.'}, status=status.HTTP_400_BAD_REQUEST)
        request.user.doctor_profile.online_status = status_value
        request.user.doctor_profile.save()
        return Response({'status': status_value})


class DoctorVacationView(generics.ListCreateAPIView):
    serializer_class = DoctorVacationSerializer
    permission_classes = [permissions.IsAuthenticated, IsDoctor]

    def get_queryset(self):
        return DoctorVacation.objects.filter(doctor__user=self.request.user)

    def perform_create(self, serializer):
        profile, _ = DoctorProfile.objects.get_or_create(user=self.request.user)
        serializer.save(doctor=profile)


class DoctorRatingView(generics.ListCreateAPIView):
    serializer_class = DoctorRatingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DoctorRating.objects.filter(doctor_id=self.kwargs['doctor_id'])

    def perform_create(self, serializer):
        doctor = DoctorProfile.objects.get(id=self.kwargs['doctor_id'])
        rating_obj = serializer.save(doctor=doctor, patient=self.request.user)
        # Update average rating
        ratings = DoctorRating.objects.filter(doctor=doctor)
        avg = sum(r.rating for r in ratings) / ratings.count()
        doctor.average_rating = round(avg, 2)
        doctor.save()
