from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('users', '0001_initial'),
        ('doctors', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Appointment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('appointment_type', models.CharField(choices=[('video', 'Video Consultation'), ('emergency', 'Emergency')], default='video', max_length=20)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show')], default='pending', max_length=20)),
                ('scheduled_at', models.DateTimeField()),
                ('duration_minutes', models.PositiveIntegerField(default=30)),
                ('chief_complaint', models.TextField(blank=True)),
                ('ai_assessment_id', models.UUIDField(blank=True, null=True)),
                ('jitsi_room_name', models.CharField(blank=True, max_length=200)),
                ('cancellation_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='patient_appointments', to='users.user')),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='doctor_appointments', to='doctors.doctorprofile')),
                ('cancelled_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cancelled_appointments', to='users.user')),
            ],
            options={'db_table': 'appointments', 'ordering': ['-scheduled_at']},
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['patient', 'status'], name='appt_patient_status_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['doctor', 'status'], name='appt_doctor_status_idx'),
        ),
        migrations.AddIndex(
            model_name='appointment',
            index=models.Index(fields=['scheduled_at'], name='appt_scheduled_at_idx'),
        ),
        migrations.CreateModel(
            name='ConsultationNote',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('subjective', models.TextField()),
                ('objective', models.TextField(blank=True)),
                ('assessment', models.TextField()),
                ('plan', models.TextField()),
                ('follow_up_date', models.DateField(blank=True, null=True)),
                ('is_shared_with_patient', models.BooleanField(default=True)),
                ('disclaimer', models.TextField(default='This consultation note is for informational purposes only and does not constitute a medical diagnosis. Please consult with a qualified healthcare professional for proper medical advice.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('appointment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='consultation_note', to='appointments.appointment')),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='consultation_notes', to='doctors.doctorprofile')),
            ],
            options={'db_table': 'consultation_notes'},
        ),
    ]
