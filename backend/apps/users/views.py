from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from .serializers import (
    PatientRegisterSerializer, DoctorRegisterSerializer,
    MediAITokenObtainPairSerializer, UserSerializer,
    ChangePasswordSerializer, GoogleAuthSerializer
)
from .models import EmailVerificationToken, PasswordResetToken
from .tasks import send_verification_email, send_password_reset_email

User = get_user_model()


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class AdminRegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        secret = request.data.get('admin_secret', '')
        expected = getattr(settings, 'ADMIN_SECRET_KEY', 'mediai-admin-secret')
        if secret != expected:
            return Response({'error': 'Invalid admin secret key.'}, status=status.HTTP_403_FORBIDDEN)
        data = {k: v for k, v in request.data.items() if k != 'admin_secret'}
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError
        try:
            validate_password(data.get('password', ''))
        except ValidationError as e:
            return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            email=data['email'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
            role=User.Role.ADMIN,
            is_email_verified=True,
            is_staff=True,
        )
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
        }, status=status.HTTP_201_CREATED)


class PatientRegisterView(generics.CreateAPIView):
    serializer_class = PatientRegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = EmailVerificationToken.objects.create(user=user)
        send_verification_email.delay(user.id, str(token.token))
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            'message': 'Account created. Please verify your email.'
        }, status=status.HTTP_201_CREATED)


class DoctorRegisterView(generics.CreateAPIView):
    serializer_class = DoctorRegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token = EmailVerificationToken.objects.create(user=user)
        send_verification_email.delay(user.id, str(token.token))
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
            'message': 'Doctor account created. Please complete your profile and await verification.'
        }, status=status.HTTP_201_CREATED)


class LoginView(TokenObtainPairView):
    serializer_class = MediAITokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]


class LogoutView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        try:
            verification = EmailVerificationToken.objects.get(token=token)
            if verification.is_expired:
                verification.delete()
                return Response({'error': 'Verification link has expired. Please register again.'}, status=status.HTTP_400_BAD_REQUEST)
            verification.user.is_email_verified = True
            verification.user.save()
            verification.delete()
            return Response({'message': 'Email verified successfully.'})
        except EmailVerificationToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            token = PasswordResetToken.objects.create(user=user)
            send_password_reset_email.delay(user.id, str(token.token))
        except User.DoesNotExist:
            pass  # Don't reveal if email exists
        return Response({'message': 'If this email exists, a reset link has been sent.'})


class ResetPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        try:
            reset_token = PasswordResetToken.objects.get(token=token, is_used=False)
            # Expire tokens older than 1 hour
            from django.utils import timezone
            from datetime import timedelta
            if timezone.now() > reset_token.created_at + timedelta(hours=1):
                reset_token.delete()
                return Response({'error': 'Reset link has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)
            from django.contrib.auth.password_validation import validate_password
            from django.core.exceptions import ValidationError
            try:
                validate_password(new_password, reset_token.user)
            except ValidationError as e:
                return Response({'error': list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
            reset_token.user.set_password(new_password)
            reset_token.user.save()
            reset_token.is_used = True
            reset_token.save()
            return Response({'message': 'Password reset successfully.'})
        except PasswordResetToken.DoesNotExist:
            return Response({'error': 'Invalid or expired token.'}, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'error': 'Incorrect current password.'}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})


class GoogleAuthView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            idinfo = id_token.verify_oauth2_token(
                serializer.validated_data['token'],
                google_requests.Request(),
                settings.SOCIAL_AUTH_GOOGLE_OAUTH2_KEY
            )
            email = idinfo['email']
            google_id = idinfo['sub']
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': idinfo.get('given_name', ''),
                    'last_name': idinfo.get('family_name', ''),
                    'google_id': google_id,
                    'is_email_verified': True,
                    'role': serializer.validated_data['role'],
                    'avatar': idinfo.get('picture', ''),
                }
            )
            if not created:
                user.google_id = google_id
                user.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'tokens': {'refresh': str(refresh), 'access': str(refresh.access_token)},
                'is_new_user': created
            })
        except ValueError:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)
