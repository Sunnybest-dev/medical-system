from django.db import models
from django.conf import settings
import uuid


class EmergencyRequest(models.Model):
    class EmergencyType(models.TextChoices):
        CHILDBIRTH = 'childbirth', 'Childbirth Emergency'
        SEVERE_BLEEDING = 'severe_bleeding', 'Severe Bleeding'
        BREATHING = 'breathing', 'Difficulty Breathing'
        UNCONSCIOUS = 'unconscious', 'Unconscious Person'
        SEVERE_INJURY = 'severe_injury', 'Severe Injury'
        CHEST_PAIN = 'chest_pain', 'Chest Pain'
        STROKE = 'stroke', 'Stroke Symptoms'
        OTHER = 'other', 'Other Emergency'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ASSIGNED = 'assigned', 'Doctor Assigned'
        IN_PROGRESS = 'in_progress', 'In Progress'
        RESOLVED = 'resolved', 'Resolved'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='emergency_requests')
    emergency_type = models.CharField(max_length=30, choices=EmergencyType.choices)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    assigned_doctor = models.ForeignKey(
        'doctors.DoctorProfile', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='emergency_assignments'
    )
    appointment = models.OneToOneField(
        'appointments.Appointment', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='emergency_request'
    )
    jitsi_room_name = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'emergency_requests'
        ordering = ['-created_at']

    CHILDBIRTH_DISCLAIMER = (
        "IMPORTANT: MediAI does NOT provide childbirth delivery instructions. "
        "We are connecting you to a qualified healthcare professional via priority video consultation. "
        "Please call your local emergency services (911/999/112) immediately while waiting."
    )
