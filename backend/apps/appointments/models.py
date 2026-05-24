from django.db import models
from django.conf import settings
import uuid


class Appointment(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        CONFIRMED = 'confirmed', 'Confirmed'
        COMPLETED = 'completed', 'Completed'
        CANCELLED = 'cancelled', 'Cancelled'
        NO_SHOW = 'no_show', 'No Show'

    class AppointmentType(models.TextChoices):
        VIDEO = 'video', 'Video Consultation'
        EMERGENCY = 'emergency', 'Emergency'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='patient_appointments')
    doctor = models.ForeignKey('doctors.DoctorProfile', on_delete=models.CASCADE, related_name='doctor_appointments')
    appointment_type = models.CharField(max_length=20, choices=AppointmentType.choices, default=AppointmentType.VIDEO)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    scheduled_at = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=30)
    chief_complaint = models.TextField(blank=True)
    ai_assessment_id = models.UUIDField(null=True, blank=True)
    jitsi_room_name = models.CharField(max_length=200, blank=True)
    cancellation_reason = models.TextField(blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='cancelled_appointments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments'
        ordering = ['-scheduled_at']
        indexes = [
            models.Index(fields=['patient', 'status']),
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['scheduled_at']),
        ]

    def __str__(self):
        return f"Appointment: {self.patient.full_name} with Dr. {self.doctor.user.full_name}"

    def save(self, *args, **kwargs):
        if not self.jitsi_room_name:
            self.jitsi_room_name = f"mediai-{self.id}"
        super().save(*args, **kwargs)


class ConsultationNote(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    appointment = models.OneToOneField(Appointment, on_delete=models.CASCADE, related_name='consultation_note')
    doctor = models.ForeignKey('doctors.DoctorProfile', on_delete=models.CASCADE, related_name='consultation_notes')
    subjective = models.TextField(help_text="Patient's complaints and history")
    objective = models.TextField(blank=True, help_text="Examination findings")
    assessment = models.TextField(help_text="Clinical assessment (NOT a diagnosis)")
    plan = models.TextField(help_text="Treatment plan and recommendations")
    follow_up_date = models.DateField(null=True, blank=True)
    is_shared_with_patient = models.BooleanField(default=True)
    disclaimer = models.TextField(
        default="This consultation note is for informational purposes only and does not constitute a medical diagnosis. Please consult with a qualified healthcare professional for proper medical advice."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'consultation_notes'
