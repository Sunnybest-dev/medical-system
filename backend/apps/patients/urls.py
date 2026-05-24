from django.urls import path
from . import views

urlpatterns = [
    path('profile/', views.PatientProfileView.as_view(), name='patient-profile'),
    path('documents/', views.MedicalDocumentListCreateView.as_view(), name='medical-documents'),
    path('documents/upload/', views.MedicalDocumentUploadView.as_view(), name='document-upload'),
    path('documents/<uuid:pk>/', views.MedicalDocumentDetailView.as_view(), name='document-detail'),
]
