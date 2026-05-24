from django.urls import path
from . import views

urlpatterns = [
    path('specializations/', views.SpecializationListView.as_view(), name='specializations'),
    path('', views.DoctorListView.as_view(), name='doctor-list'),
    path('<uuid:pk>/', views.DoctorDetailView.as_view(), name='doctor-detail'),
    path('profile/', views.DoctorProfileView.as_view(), name='doctor-profile'),
    path('documents/upload/', views.DoctorDocumentUploadView.as_view(), name='doctor-doc-upload'),
    path('availability/', views.DoctorAvailabilityView.as_view(), name='doctor-availability'),
    path('availability/<uuid:pk>/', views.DoctorAvailabilityDetailView.as_view(), name='doctor-availability-detail'),
    path('status/', views.DoctorStatusUpdateView.as_view(), name='doctor-status'),
    path('vacations/', views.DoctorVacationView.as_view(), name='doctor-vacations'),
    path('<uuid:doctor_id>/ratings/', views.DoctorRatingView.as_view(), name='doctor-ratings'),
]
