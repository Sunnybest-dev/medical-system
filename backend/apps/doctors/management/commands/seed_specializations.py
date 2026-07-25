from django.core.management.base import BaseCommand
from apps.doctors.models import Specialization

SPECIALIZATIONS = [
    ("Cardiology", "Heart and cardiovascular system", "heart"),
    ("Dermatology", "Skin, hair, and nails", "skin"),
    ("Emergency Medicine", "Acute and emergency care", "zap"),
    ("Endocrinology", "Hormones and metabolic disorders", "activity"),
    ("Family Medicine", "Primary care for all ages", "users"),
    ("Gastroenterology", "Digestive system disorders", "pill"),
    ("General Practice", "General health and wellness", "stethoscope"),
    ("Geriatrics", "Healthcare for elderly patients", "user"),
    ("Gynaecology", "Female reproductive health", "heart"),
    ("Haematology", "Blood disorders", "droplets"),
    ("Infectious Disease", "Infections and communicable diseases", "shield"),
    ("Internal Medicine", "Adult diseases and conditions", "clipboard"),
    ("Nephrology", "Kidney diseases", "activity"),
    ("Neurology", "Brain and nervous system", "brain"),
    ("Obstetrics", "Pregnancy and childbirth", "baby"),
    ("Oncology", "Cancer diagnosis and treatment", "shield-alert"),
    ("Ophthalmology", "Eye diseases and vision", "eye"),
    ("Orthopaedics", "Bones, joints, and muscles", "bone"),
    ("Otolaryngology (ENT)", "Ear, nose, and throat", "ear"),
    ("Paediatrics", "Healthcare for children", "smile"),
    ("Pathology", "Disease diagnosis via lab tests", "microscope"),
    ("Psychiatry", "Mental health disorders", "brain"),
    ("Pulmonology", "Lung and respiratory diseases", "wind"),
    ("Radiology", "Medical imaging and diagnostics", "scan"),
    ("Rheumatology", "Joints, muscles, and autoimmune diseases", "activity"),
    ("Surgery (General)", "Surgical procedures", "scissors"),
    ("Urology", "Urinary tract and male reproductive system", "activity"),
    ("Vascular Surgery", "Blood vessel diseases", "heart"),
]


class Command(BaseCommand):
    help = "Seed the specializations table with common medical specializations."

    def handle(self, *args, **options):
        created_count = 0
        for name, description, icon in SPECIALIZATIONS:
            _, created = Specialization.objects.get_or_create(
                name=name,
                defaults={"description": description, "icon": icon},
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created_count} new specialization(s) added, "
                f"{len(SPECIALIZATIONS) - created_count} already existed."
            )
        )
