from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Count, Avg
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User
from apps.doctors.models import DoctorProfile
from apps.appointments.models import Appointment
from apps.ai_engine.models import AIAssessment, Symptom
from apps.payments.models import Payment
from apps.doctors.serializers import DoctorProfileSerializer
from apps.users.serializers import UserSerializer
from apps.notifications.tasks import push_notification


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role == User.Role.ADMIN


class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_users = User.objects.filter(role=User.Role.PATIENT).count()
        total_doctors = DoctorProfile.objects.filter(
            verification_status=DoctorProfile.VerificationStatus.APPROVED
        ).count()
        pending_verifications = DoctorProfile.objects.filter(
            verification_status__in=['pending', 'under_review']
        ).count()
        total_consultations = Appointment.objects.filter(status='completed').count()
        monthly_consultations = Appointment.objects.filter(
            status='completed', created_at__gte=thirty_days_ago
        ).count()

        top_symptoms = (
            Symptom.objects.annotate(count=Count('assessments'))
            .order_by('-count')[:10]
            .values('name', 'count')
        )

        return Response({
            'stats': {
                'total_patients': total_users,
                'total_approved_doctors': total_doctors,
                'pending_verifications': pending_verifications,
                'total_consultations': total_consultations,
                'monthly_consultations': monthly_consultations,
            },
            'top_symptoms': list(top_symptoms),
        })


class DoctorVerificationListView(generics.ListAPIView):
    serializer_class = DoctorProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        status_filter = self.request.query_params.get('status', 'pending')
        return DoctorProfile.objects.filter(
            verification_status=status_filter
        ).select_related('user', 'specialization').prefetch_related('documents')


class DoctorVerificationActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, doctor_id):
        action = request.data.get('action')  # approve, reject, suspend
        reason = request.data.get('reason', '')

        try:
            doctor = DoctorProfile.objects.get(id=doctor_id)
        except DoctorProfile.DoesNotExist:
            return Response({'error': 'Doctor not found.'}, status=status.HTTP_404_NOT_FOUND)

        status_map = {
            'approve': DoctorProfile.VerificationStatus.APPROVED,
            'reject': DoctorProfile.VerificationStatus.REJECTED,
            'suspend': DoctorProfile.VerificationStatus.SUSPENDED,
            'review': DoctorProfile.VerificationStatus.UNDER_REVIEW,
        }

        if action not in status_map:
            return Response({'error': 'Invalid action.'}, status=status.HTTP_400_BAD_REQUEST)

        doctor.verification_status = status_map[action]
        if action in ['reject', 'suspend']:
            doctor.rejection_reason = reason
        if action == 'approve':
            doctor.verified_at = timezone.now()
        doctor.save()

        # Notify doctor
        messages = {
            'approve': ('Account Approved! 🎉', 'Your doctor account has been approved. You can now accept consultations.'),
            'reject': ('Account Rejected', f'Your account was rejected. Reason: {reason}'),
            'suspend': ('Account Suspended', f'Your account has been suspended. Reason: {reason}'),
            'review': ('Under Review', 'Your documents are being reviewed by our team.'),
        }
        title, msg = messages[action]
        push_notification(doctor.user.id, title, msg, 'verification')

        return Response({'message': f'Doctor {action}d successfully.', 'status': doctor.verification_status})


class UserManagementView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        role = self.request.query_params.get('role', 'patient')
        return User.objects.filter(role=role).order_by('-created_at')


class UserActionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        action = request.data.get('action')
        try:
            user = User.objects.get(id=user_id)
            if action == 'deactivate':
                user.is_active = False
                user.save()
            elif action == 'activate':
                user.is_active = True
                user.save()
            return Response({'message': f'User {action}d successfully.'})
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.doctors.models import Specialization
        specialization_stats = (
            Appointment.objects.filter(status='completed')
            .values('doctor__specialization__name')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        return Response({
            'specialization_demand': list(specialization_stats),
            'severity_distribution': list(
                AIAssessment.objects.values('severity_level').annotate(count=Count('id'))
            ),
        })
