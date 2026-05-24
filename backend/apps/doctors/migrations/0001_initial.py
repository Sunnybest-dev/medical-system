from django.db import migrations, models
import django.core.validators
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Specialization',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, unique=True)),
                ('description', models.TextField(blank=True)),
                ('icon', models.CharField(blank=True, max_length=50)),
            ],
            options={'db_table': 'specializations', 'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='DoctorProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('medical_license_number', models.CharField(max_length=100, unique=True)),
                ('medical_council_registration', models.CharField(blank=True, max_length=100)),
                ('years_of_experience', models.PositiveIntegerField(default=0)),
                ('consultation_fee', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('languages_spoken', models.JSONField(default=list)),
                ('bio', models.TextField(blank=True)),
                ('education', models.JSONField(default=list)),
                ('verification_status', models.CharField(choices=[('pending', 'Pending'), ('under_review', 'Under Review'), ('approved', 'Approved'), ('suspended', 'Suspended'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('online_status', models.CharField(choices=[('available', 'Available'), ('busy', 'Busy'), ('offline', 'Offline'), ('emergency_duty', 'Emergency Duty')], default='offline', max_length=20)),
                ('average_rating', models.DecimalField(decimal_places=2, default=0, max_digits=3)),
                ('total_consultations', models.PositiveIntegerField(default=0)),
                ('total_earnings', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('rejection_reason', models.TextField(blank=True)),
                ('verified_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('specialization', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='doctors', to='doctors.specialization')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='doctor_profile', to='users.user')),
            ],
            options={'db_table': 'doctor_profiles'},
        ),
        migrations.AddIndex(
            model_name='doctorprofile',
            index=models.Index(fields=['verification_status'], name='doctor_verification_idx'),
        ),
        migrations.AddIndex(
            model_name='doctorprofile',
            index=models.Index(fields=['online_status'], name='doctor_online_idx'),
        ),
        migrations.AddIndex(
            model_name='doctorprofile',
            index=models.Index(fields=['specialization'], name='doctor_specialization_idx'),
        ),
        migrations.CreateModel(
            name='DoctorDocument',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('document_type', models.CharField(choices=[('government_id', 'Government ID'), ('medical_license', 'Medical License'), ('qualification', 'Qualification Certificate'), ('profile_photo', 'Profile Photo')], max_length=30)),
                ('file_url', models.URLField()),
                ('is_verified', models.BooleanField(default=False)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='documents', to='doctors.doctorprofile')),
            ],
            options={'db_table': 'doctor_documents'},
        ),
        migrations.CreateModel(
            name='DoctorAvailability',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('day_of_week', models.CharField(choices=[('monday', 'Monday'), ('tuesday', 'Tuesday'), ('wednesday', 'Wednesday'), ('thursday', 'Thursday'), ('friday', 'Friday'), ('saturday', 'Saturday'), ('sunday', 'Sunday')], max_length=10)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('is_active', models.BooleanField(default=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availability', to='doctors.doctorprofile')),
            ],
            options={'db_table': 'doctor_availability', 'unique_together': {('doctor', 'day_of_week')}},
        ),
        migrations.CreateModel(
            name='DoctorVacation',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('reason', models.CharField(blank=True, max_length=200)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='vacations', to='doctors.doctorprofile')),
            ],
            options={'db_table': 'doctor_vacations'},
        ),
        migrations.CreateModel(
            name='DoctorRating',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('rating', models.PositiveSmallIntegerField(validators=[django.core.validators.MinValueValidator(1), django.core.validators.MaxValueValidator(5)])),
                ('review', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('doctor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='ratings', to='doctors.doctorprofile')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='given_ratings', to='users.user')),
            ],
            options={'db_table': 'doctor_ratings', 'unique_together': {('doctor', 'patient')}},
        ),
    ]
