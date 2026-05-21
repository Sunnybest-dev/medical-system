from django.db import models

class DrugCategory(models.Model):
    """Categories for organizing drugs"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'drug_categories'
        verbose_name_plural = 'Drug Categories'

class Drug(models.Model):
    """Drug/Medication information"""
    name = models.CharField(max_length=200)
    generic_name = models.CharField(max_length=200, blank=True)
    category = models.ForeignKey(DrugCategory, on_delete=models.CASCADE, related_name='drugs')
    description = models.TextField()
    dosage_instructions = models.TextField()
    side_effects = models.TextField()
    contraindications = models.TextField()
    warnings = models.TextField(blank=True)
    
    # API integration fields
    fda_approved = models.BooleanField(default=False)
    api_source = models.CharField(max_length=50, blank=True, choices=[
        ('fda', 'FDA Database'),
        ('rxnav', 'RxNav'),
        ('local', 'Local Database'),
        ('manual', 'Manual Entry')
    ])
    api_last_updated = models.DateTimeField(null=True, blank=True)
    
    # Usage flags
    is_prescription_only = models.BooleanField(default=False)
    is_general_use = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.generic_name or 'No generic'})"

    class Meta:
        db_table = 'drugs'
        unique_together = ['name', 'generic_name']

class DrugInteraction(models.Model):
    """Drug interaction warnings"""
    drug1 = models.ForeignKey(Drug, on_delete=models.CASCADE, related_name='interactions_as_drug1')
    drug2 = models.ForeignKey(Drug, on_delete=models.CASCADE, related_name='interactions_as_drug2')
    interaction_type = models.CharField(max_length=50, choices=[
        ('major', 'Major - Avoid combination'),
        ('moderate', 'Moderate - Monitor closely'),
        ('minor', 'Minor - Be aware'),
    ])
    description = models.TextField()
    severity_level = models.IntegerField(default=1, choices=[
        (1, 'Low'),
        (2, 'Medium'),
        (3, 'High'),
        (4, 'Critical')
    ])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.drug1.name} + {self.drug2.name} ({self.interaction_type})"

    class Meta:
        db_table = 'drug_interactions'
        unique_together = ['drug1', 'drug2']

# Link drugs to medical rules
from apps.symptoms.models import MedicalRule
MedicalRule.add_to_class('recommended_drugs', models.ManyToManyField(Drug, related_name='medical_rules', blank=True))