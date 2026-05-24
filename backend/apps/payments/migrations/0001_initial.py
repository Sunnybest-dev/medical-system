from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        ('users', '0001_initial'),
        ('appointments', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Payment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('currency', models.CharField(default='USD', max_length=3)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('paid', 'Paid'), ('cancelled', 'Cancelled'), ('refunded', 'Refunded'), ('demo', 'Demo Payment')], default='pending', max_length=20)),
                ('provider', models.CharField(choices=[('demo', 'Demo'), ('paystack', 'Paystack'), ('flutterwave', 'Flutterwave'), ('stripe', 'Stripe')], default='demo', max_length=20)),
                ('transaction_id', models.CharField(blank=True, max_length=200)),
                ('payment_reference', models.CharField(blank=True, max_length=200, unique=True)),
                ('paid_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('appointment', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='payment', to='appointments.appointment')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='users.user')),
            ],
            options={'db_table': 'payments', 'ordering': ['-created_at']},
        ),
    ]
