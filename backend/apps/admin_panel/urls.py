from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.AdminDashboardView.as_view(), name='admin-dashboard'),
    path('doctors/pending/', views.DoctorVerificationListView.as_view(), name='doctor-verification-list'),
    path('doctors/<uuid:doctor_id>/action/', views.DoctorVerificationActionView.as_view(), name='doctor-action'),
    path('users/', views.UserManagementView.as_view(), name='user-management'),
    path('users/<uuid:user_id>/action/', views.UserActionView.as_view(), name='user-action'),
    path('analytics/', views.AdminAnalyticsView.as_view(), name='admin-analytics'),
]
