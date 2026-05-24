from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
import uuid
from .models import Payment
from .serializers import PaymentSerializer
from apps.appointments.models import Appointment


class InitiatePaymentView(APIView):
    """
    Demo payment architecture - ready for real provider integration.
    Future: Integrate Paystack/Flutterwave/Stripe here.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        appointment_id = request.data.get('appointment_id')
        provider = request.data.get('provider', 'demo')

        try:
            appointment = Appointment.objects.get(id=appointment_id, patient=request.user)
        except Appointment.DoesNotExist:
            return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

        payment, created = Payment.objects.get_or_create(
            appointment=appointment,
            defaults={
                'patient': request.user,
                'amount': appointment.doctor.consultation_fee,
                'provider': provider,
                'payment_reference': f"MEDIAI-{uuid.uuid4().hex[:12].upper()}",
            }
        )

        if provider == 'demo':
            return Response({
                'payment_id': str(payment.id),
                'reference': payment.payment_reference,
                'amount': str(payment.amount),
                'currency': payment.currency,
                'provider': 'demo',
                'demo_notice': 'This is a demo payment. No real transaction will occur.',
                'status': 'pending',
            })

        # Future: Return provider-specific payment URL
        return Response({
            'payment_id': str(payment.id),
            'reference': payment.payment_reference,
            'provider': provider,
            'message': f'{provider.title()} integration coming soon.',
        })


class ConfirmDemoPaymentView(APIView):
    """Demo payment confirmation - simulates successful payment"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get('reference')
        try:
            payment = Payment.objects.get(payment_reference=reference, patient=request.user)
            payment.status = Payment.Status.DEMO
            payment.paid_at = timezone.now()
            payment.transaction_id = f"DEMO-{uuid.uuid4().hex[:8].upper()}"
            payment.save()
            return Response({
                'message': 'Demo payment confirmed.',
                'payment': PaymentSerializer(payment).data,
            })
        except Payment.DoesNotExist:
            return Response({'error': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)


class PaymentHistoryView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(patient=self.request.user)
