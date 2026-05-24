from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Symptom',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('category', models.CharField(blank=True, max_length=100)),
                ('is_emergency', models.BooleanField(default=False)),
            ],
            options={'db_table': 'symptoms', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='AIAssessment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('symptom_details', models.JSONField(default=dict)),
                ('severity_level', models.CharField(choices=[('green', 'Green - Self Care'), ('yellow', 'Yellow - See Doctor'), ('red', 'Red - Emergency')], max_length=10)),
                ('possible_conditions', models.JSONField(default=list)),
                ('suggested_specialist', models.CharField(blank=True, max_length=200)),
                ('medication_info', models.JSONField(default=list)),
                ('recommendations', models.TextField()),
                ('ai_raw_response', models.TextField(blank=True)),
                ('disclaimer', models.TextField(default='IMPORTANT MEDICAL DISCLAIMER: This AI assessment is for informational purposes only. It does NOT constitute a medical diagnosis. The possible conditions listed are not confirmed diagnoses. Always consult a qualified healthcare professional for proper medical evaluation and treatment.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ai_assessments', to='users.user')),
                ('symptoms', models.ManyToManyField(related_name='assessments', to='ai_engine.symptom')),
            ],
            options={'db_table': 'ai_assessments', 'ordering': ['-created_at']},
        ),
    ]
