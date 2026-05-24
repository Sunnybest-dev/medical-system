from django.urls import path
from . import views

urlpatterns = [
    path('', views.CreateEmergencyView.as_view(), name='create-emergency'),
    path('list/', views.EmergencyListView.as_view(), name='emergency-list'),
    path('<uuid:pk>/', views.EmergencyDetailView.as_view(), name='emergency-detail'),
]
