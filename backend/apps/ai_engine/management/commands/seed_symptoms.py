from django.core.management.base import BaseCommand
from apps.ai_engine.models import Symptom
from apps.doctors.models import Specialization


SYMPTOMS = [
    ('Fever', 'General', False),
    ('Headache', 'Neurological', False),
    ('Cough', 'Respiratory', False),
    ('Vomiting', 'Gastrointestinal', False),
    ('Nausea', 'Gastrointestinal', False),
    ('Diarrhea', 'Gastrointestinal', False),
    ('Fatigue', 'General', False),
    ('Abdominal Pain', 'Gastrointestinal', False),
    ('Chest Pain', 'Cardiovascular', True),
    ('Difficulty Breathing', 'Respiratory', True),
    ('Sore Throat', 'Respiratory', False),
    ('Runny Nose', 'Respiratory', False),
    ('Body Aches', 'General', False),
    ('Dizziness', 'Neurological', False),
    ('Rash', 'Dermatological', False),
    ('Itching', 'Dermatological', False),
    ('Back Pain', 'Musculoskeletal', False),
    ('Joint Pain', 'Musculoskeletal', False),
    ('Loss of Appetite', 'General', False),
    ('Weight Loss', 'General', False),
    ('Swollen Lymph Nodes', 'Immunological', False),
    ('Blurred Vision', 'Ophthalmological', False),
    ('Ear Pain', 'ENT', False),
    ('Frequent Urination', 'Urological', False),
    ('Painful Urination', 'Urological', False),
    ('Palpitations', 'Cardiovascular', True),
    ('Seizures', 'Neurological', True),
    ('Severe Bleeding', 'Emergency', True),
    ('Loss of Consciousness', 'Emergency', True),
    ('Stroke Symptoms', 'Neurological', True),
    ('Swelling', 'General', False),
    ('Numbness', 'Neurological', False),
    ('Anxiety', 'Mental Health', False),
    ('Insomnia', 'Mental Health', False),
    ('Depression', 'Mental Health', False),
]

SPECIALIZATIONS = [
    ('General Practitioner', 'Primary care and general health'),
    ('Cardiologist', 'Heart and cardiovascular system'),
    ('Dermatologist', 'Skin, hair, and nails'),
    ('Neurologist', 'Brain and nervous system'),
    ('Gastroenterologist', 'Digestive system'),
    ('Pulmonologist', 'Lungs and respiratory system'),
    ('Orthopedist', 'Bones, joints, and muscles'),
    ('Pediatrician', 'Children\'s health'),
    ('Gynecologist', 'Women\'s reproductive health'),
    ('Urologist', 'Urinary tract and male reproductive system'),
    ('Ophthalmologist', 'Eyes and vision'),
    ('ENT Specialist', 'Ear, nose, and throat'),
    ('Psychiatrist', 'Mental health'),
    ('Endocrinologist', 'Hormones and metabolism'),
    ('Oncologist', 'Cancer treatment'),
    ('Emergency Medicine', 'Emergency and critical care'),
    ('Immunologist', 'Immune system disorders'),
    ('Rheumatologist', 'Autoimmune and joint diseases'),
]


class Command(BaseCommand):
    help = 'Seed initial symptoms and specializations data'

    def handle(self, *args, **kwargs):
        # Seed symptoms
        created_symptoms = 0
        for name, category, is_emergency in SYMPTOMS:
            _, created = Symptom.objects.get_or_create(
                name=name,
                defaults={'category': category, 'is_emergency': is_emergency}
            )
            if created:
                created_symptoms += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Seeded {created_symptoms} symptoms ({Symptom.objects.count()} total)'))

        # Seed specializations
        created_specs = 0
        for name, description in SPECIALIZATIONS:
            _, created = Specialization.objects.get_or_create(
                name=name,
                defaults={'description': description}
            )
            if created:
                created_specs += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Seeded {created_specs} specializations ({Specialization.objects.count()} total)'))
        self.stdout.write(self.style.SUCCESS('🎉 Database seeding complete!'))
