import logging
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)
User = get_user_model()


def send_verification_email(user_id, token):
    try:
        user = User.objects.get(id=user_id)
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        send_mail(
            subject='Verify your Mxta account',
            message=f'Hi {user.first_name},\n\nClick the link to verify your email:\n{verify_url}\n\nMxta Team',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.warning('send_verification_email failed: %s', e)


def send_password_reset_email(user_id, token):
    try:
        user = User.objects.get(id=user_id)
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        send_mail(
            subject='Reset your Mxta password',
            message=f'Hi {user.first_name},\n\nClick the link to reset your password:\n{reset_url}\n\nThis link expires in 1 hour.\n\nMxta Team',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        logger.warning('send_password_reset_email failed: %s', e)
