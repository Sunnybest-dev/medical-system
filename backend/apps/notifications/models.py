from django.db import models
from django.conf import settings
import uuid


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        APPOINTMENT = 'appointment', 'Appointment'
        MESSAGE = 'message', 'Message'
        EMERGENCY = 'emergency', 'Emergency'
        VERIFICATION = 'verification', 'Verification'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
