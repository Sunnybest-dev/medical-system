from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/patient/', views.PatientRegisterView.as_view(), name='patient-register'),
    path('register/doctor/', views.DoctorRegisterView.as_view(), name='doctor-register'),
    path('register/admin/', views.AdminRegisterView.as_view(), name='admin-register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('verify-email/', views.VerifyEmailView.as_view(), name='verify-email'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', views.ResetPasswordView.as_view(), name='reset-password'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('google/', views.GoogleAuthView.as_view(), name='google-auth'),
]
