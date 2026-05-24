from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('users', '0001_initial'),
        ('doctors', '0001_initial'),
        ('appointments', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmergencyRequest',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('emergency_type', models.CharField(choices=[('childbirth', 'Childbirth Emergency'), ('severe_bleeding', 'Severe Bleeding'), ('breathing', 'Difficulty Breathing'), ('unconscious', 'Unconscious Person'), ('severe_injury', 'Severe Injury'), ('chest_pain', 'Chest Pain'), ('stroke', 'Stroke Symptoms'), ('other', 'Other Emergency')], max_length=30)),
                ('description', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('assigned', 'Doctor Assigned'), ('in_progress', 'In Progress'), ('resolved', 'Resolved'), ('cancelled', 'Cancelled')], default='pending', max_length=20)),
                ('jitsi_room_name', models.CharField(blank=True, max_length=200)),
                ('location', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='emergency_requests', to='users.user')),
                ('assigned_doctor', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='emergency_assignments', to='doctors.doctorprofile')),
                ('appointment', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='emergency_request', to='appointments.appointment')),
            ],
            options={'db_table': 'emergency_requests', 'ordering': ['-created_at']},
        ),
    ]
