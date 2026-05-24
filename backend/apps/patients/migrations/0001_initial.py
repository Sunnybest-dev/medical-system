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
            name='PatientProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('blood_group', models.CharField(blank=True, choices=[('A+', 'A+'), ('A-', 'A-'), ('B+', 'B+'), ('B-', 'B-'), ('AB+', 'AB+'), ('AB-', 'AB-'), ('O+', 'O+'), ('O-', 'O-')], max_length=5)),
                ('allergies', models.TextField(blank=True)),
                ('existing_conditions', models.TextField(blank=True)),
                ('current_medications', models.TextField(blank=True)),
                ('emergency_contact_name', models.CharField(blank=True, max_length=200)),
                ('emergency_contact_phone', models.CharField(blank=True, max_length=20)),
                ('emergency_contact_relationship', models.CharField(blank=True, max_length=100)),
                ('height_cm', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('weight_kg', models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='patient_profile', to='users.user')),
            ],
            options={'db_table': 'patient_profiles'},
        ),
        migrations.CreateModel(
            name='MedicalDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('document_type', models.CharField(choices=[('lab_report', 'Lab Report'), ('scan', 'Scan Result'), ('prescription', 'Prescription'), ('xray', 'X-Ray'), ('other', 'Other')], max_length=20)),
                ('title', models.CharField(max_length=200)),
                ('file_url', models.URLField()),
                ('notes', models.TextField(blank=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='patients.patientprofile')),
            ],
            options={'db_table': 'medical_documents', 'ordering': ['-uploaded_at']},
        ),
    ]
