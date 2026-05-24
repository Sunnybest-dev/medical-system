from django.urls import path
from . import views

urlpatterns = [
    path('', views.AppointmentListCreateView.as_view(), name='appointments'),
    path('<uuid:pk>/', views.AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<uuid:pk>/status/', views.AppointmentStatusUpdateView.as_view(), name='appointment-status'),
    path('<uuid:pk>/jitsi-token/', views.JitsiTokenView.as_view(), name='jitsi-token'),
    path('today/', views.TodayAppointmentsView.as_view(), name='today-appointments'),
    path('notes/', views.ConsultationNoteView.as_view(), name='consultation-notes'),
    path('notes/<uuid:pk>/', views.ConsultationNoteDetailView.as_view(), name='consultation-note-detail'),
]
