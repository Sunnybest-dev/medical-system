from django.urls import path
from . import views

urlpatterns = [
    path('symptoms/', views.SymptomListView.as_view(), name='symptoms'),
    path('followup-questions/', views.FollowupQuestionsView.as_view(), name='followup-questions'),
    path('assess/', views.PerformAssessmentView.as_view(), name='perform-assessment'),
    path('assessments/', views.AssessmentHistoryView.as_view(), name='assessment-history'),
    path('assessments/<uuid:pk>/', views.AssessmentDetailView.as_view(), name='assessment-detail'),
    path('medication-info/', views.MedicationInfoView.as_view(), name='medication-info'),
]
