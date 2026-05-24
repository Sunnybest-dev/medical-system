from django.db import models
from django.conf import settings
import uuid


class Symptom(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=100, blank=True)
    is_emergency = models.BooleanField(default=False)

    class Meta:
        db_table = 'symptoms'
        ordering = ['name']

    def __str__(self):
        return self.name


class AIAssessment(models.Model):
    class SeverityLevel(models.TextChoices):
        GREEN = 'green', 'Green - Self Care'
        YELLOW = 'yellow', 'Yellow - See Doctor'
        RED = 'red', 'Red - Emergency'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_assessments')
    symptoms = models.ManyToManyField(Symptom, related_name='assessments')
    symptom_details = models.JSONField(default=dict, help_text='Follow-up answers')
    severity_level = models.CharField(max_length=10, choices=SeverityLevel.choices)
    possible_conditions = models.JSONField(default=list)
    suggested_specialist = models.CharField(max_length=200, blank=True)
    medication_info = models.JSONField(default=list)
    recommendations = models.TextField()
    ai_raw_response = models.TextField(blank=True)
    disclaimer = models.TextField(
        default="IMPORTANT MEDICAL DISCLAIMER: This AI assessment is for informational purposes only. "
                "It does NOT constitute a medical diagnosis. The possible conditions listed are not confirmed diagnoses. "
                "Always consult a qualified healthcare professional for proper medical evaluation and treatment."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'ai_assessments'
        ordering = ['-created_at']
