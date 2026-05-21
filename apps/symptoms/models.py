from django.db import models

class SymptomCategory(models.Model):
    """Categories for organizing symptoms"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'symptom_categories'
        verbose_name_plural = 'Symptom Categories'

class Symptom(models.Model):
    """Individual symptoms that users can report"""
    name = models.CharField(max_length=200)
    category = models.ForeignKey(SymptomCategory, on_delete=models.CASCADE, related_name='symptoms')
    description = models.TextField(blank=True)
    severity_level = models.IntegerField(default=1, choices=[
        (1, 'Mild'),
        (2, 'Moderate'), 
        (3, 'Severe'),
        (4, 'Critical')
    ])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.category.name})"

    class Meta:
        db_table = 'symptoms'
        unique_together = ['name', 'category']

class MedicalRule(models.Model):
    """Rules for symptom-to-condition mapping"""
    name = models.CharField(max_length=200)
    symptoms = models.ManyToManyField(Symptom, related_name='rules')
    condition_name = models.CharField(max_length=200)
    confidence_threshold = models.FloatField(default=0.7, help_text="Minimum match percentage to trigger this rule")
    warning_message = models.TextField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} -> {self.condition_name}"

    class Meta:
        db_table = 'medical_rules'

class CustomSymptom(models.Model):
    """User-submitted custom symptoms"""
    user = models.ForeignKey('accounts.User', on_delete=models.CASCADE)
    description = models.TextField()
    analyzed_keywords = models.JSONField(default=list, blank=True)
    matched_symptoms = models.ManyToManyField(Symptom, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Custom: {self.description[:50]}..."

    class Meta:
        db_table = 'custom_symptoms'