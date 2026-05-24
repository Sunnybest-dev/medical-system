from django.urls import path
from . import views

urlpatterns = [
    path('initiate/', views.InitiatePaymentView.as_view(), name='initiate-payment'),
    path('confirm-demo/', views.ConfirmDemoPaymentView.as_view(), name='confirm-demo-payment'),
    path('history/', views.PaymentHistoryView.as_view(), name='payment-history'),
]
