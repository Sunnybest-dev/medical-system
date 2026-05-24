from django.urls import path
from . import views

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notifications'),
    path('unread/', views.UnreadCountView.as_view(), name='unread-count'),
    path('mark-read/', views.MarkNotificationReadView.as_view(), name='mark-all-read'),
    path('<uuid:pk>/read/', views.MarkNotificationReadView.as_view(), name='mark-read'),
]
