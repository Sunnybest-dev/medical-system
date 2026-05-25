import google.generativeai as genai
from django.conf import settings
import json
import re
import logging

logger = logging.getLogger(__name__)


class GeminiProvider:
    def __init__(self):
        self.available = False
        api_key = getattr(settings, 'GEMINI_API_KEY', '')
        if not api_key:
            logger.warning('GEMINI_API_KEY is not set — AI features will use fallback responses.')
            return
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash')
            )
            self.available = True
        except Exception as e:
            logger.error(f'Failed to initialise Gemini: {e}')

    def generate(self, prompt: str) -> str:
        if not self.available:
            return ''
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f'Gemini generate error: {e}')
            return ''


class HealthAssessmentService:
    DISCLAIMER = (
        "CRITICAL: You are an AI health information assistant. "
        "NEVER use the word 'diagnosis' or 'diagnose'. "
        "Always use 'possible conditions' instead. "
        "This is for informational purposes only."
    )

    def __init__(self):
        self.provider = GeminiProvider()

    def get_followup_questions(self, symptoms: list) -> list:
        default_questions = [
            "How long have you had these symptoms?",
            "How would you rate the severity from 1 to 10?",
            "Do you have any existing medical conditions?",
            "Are you currently taking any medications?",
            "Have you experienced these symptoms before?",
        ]

        if not self.provider.available:
            return default_questions

        symptom_list = ', '.join(symptoms)
        prompt = f"""You are a medical triage assistant. A patient reports: {symptom_list}

Generate 5 highly specific follow-up questions tailored EXACTLY to these symptoms.
Each question must directly relate to one or more of the reported symptoms.
Do NOT ask generic questions like "how long" or "rate your pain" unless directly relevant.

Examples for headache: "Is the headache throbbing or constant?", "Does light or noise make it worse?"
Examples for chest pain: "Does the pain radiate to your arm or jaw?", "Does it worsen with physical activity?"
Examples for fever: "What is your temperature reading?", "Do you have chills or night sweats?"

Return ONLY a JSON array of 5 question strings, no explanation:
["question 1", "question 2", "question 3", "question 4", "question 5"]
"""
        response = self.provider.generate(prompt)
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, AttributeError):
            pass
        return default_questions

    def perform_assessment(self, symptoms: list, followup_answers: dict, patient_info: dict = None) -> dict:
        if not self.provider.available:
            return self._fallback_assessment(symptoms)

        symptom_list = ', '.join(symptoms)
        answers_text = '\n'.join([f"- {q}: {a}" for q, a in followup_answers.items()])
        patient_context = ""
        if patient_info:
            patient_context = f"""
Patient Context:
- Age: {patient_info.get('age', 'Unknown')}
- Gender: {patient_info.get('gender', 'Unknown')}
- Known conditions: {patient_info.get('existing_conditions', 'None')}
- Current medications: {patient_info.get('current_medications', 'None')}
- Allergies: {patient_info.get('allergies', 'None')}
"""

        prompt = f"""{self.DISCLAIMER}
{patient_context}
Reported Symptoms: {symptom_list}

Follow-up Information:
{answers_text}

Provide a detailed health assessment in the following JSON format ONLY:
{{
  "severity_level": "green|yellow|red",
  "severity_reason": "Brief explanation of severity",
  "possible_conditions": [
    {{"name": "Condition Name", "likelihood": "high|medium|low", "description": "Brief description"}}
  ],
  "suggested_specialist": "Type of specialist",
  "recommendations": "Specific actionable recommendations",
  "when_to_seek_emergency": "Signs that require immediate emergency care",
  "general_care_tips": ["tip1", "tip2"],
  "suggested_medications": [
    {{
      "name": "Medication name (generic)",
      "purpose": "What it treats in this context",
      "how_to_take": "e.g. Take 1 tablet every 8 hours with food",
      "duration": "e.g. 5-7 days or as directed by doctor",
      "common_side_effects": ["nausea", "dizziness"],
      "overdose_warning": "What happens if too much is taken and what to do",
      "otc_or_prescription": "OTC or Prescription"
    }}
  ],
  "diagnosis_summary": "A plain-language summary of what the patient likely has based on symptoms and answers"
}}

SEVERITY RULES:
- RED: Chest pain, difficulty breathing, stroke symptoms, severe bleeding, unconsciousness, seizures
- YELLOW: Persistent fever >3 days, repeated vomiting, moderate pain, worsening symptoms
- GREEN: Mild symptoms, common cold, minor headache, manageable conditions

IMPORTANT RULES:
- For suggested_medications, only suggest safe OTC drugs where appropriate. Always note if prescription is needed.
- Include overdose_warning for every suggested medication.
- diagnosis_summary must be written in simple language a non-medical person understands.
- NEVER use the word "diagnosis" in possible_conditions. Use "possible conditions".
- Always recommend consulting a doctor before taking any medication.
"""
        response = self.provider.generate(prompt)
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                result['disclaimer'] = (
                    "IMPORTANT MEDICAL DISCLAIMER: This AI health assessment is for informational purposes only. "
                    "It does NOT constitute a medical diagnosis. Always consult a qualified healthcare professional."
                )
                return result
        except (json.JSONDecodeError, AttributeError):
            pass

        return self._fallback_assessment(symptoms)

    def _fallback_assessment(self, symptoms: list) -> dict:
        emergency_keywords = ['chest pain', 'difficulty breathing', 'stroke', 'seizure', 'severe bleeding', 'unconscious', 'palpitations']
        is_emergency = any(kw in ' '.join(symptoms).lower() for kw in emergency_keywords)
        return {
            "severity_level": "red" if is_emergency else "yellow",
            "severity_reason": "Emergency symptoms detected — seek immediate care" if is_emergency else "Please consult a doctor for a proper evaluation",
            "possible_conditions": [],
            "suggested_specialist": "Emergency Medicine" if is_emergency else "General Practitioner",
            "recommendations": "Call emergency services or go to the nearest ER immediately." if is_emergency else "Schedule an appointment with your doctor for a proper evaluation.",
            "when_to_seek_emergency": "If symptoms worsen rapidly, seek emergency care immediately.",
            "general_care_tips": ["Rest and stay hydrated", "Monitor your symptoms closely", "Seek medical attention if symptoms worsen"],
            "disclaimer": "This assessment is for informational purposes only and does NOT constitute a medical diagnosis."
        }

    def get_medication_info(self, medication_name: str) -> dict:
        if not self.provider.available:
            return {'error': 'AI service is currently unavailable. Please consult a pharmacist for medication information.'}

        prompt = f"""Provide factual information about the medication: {medication_name}

Return ONLY this JSON format:
{{
  "name": "Medication name",
  "generic_name": "Generic name if applicable",
  "drug_class": "Drug classification",
  "purpose": "What it is commonly used for",
  "how_it_works": "Brief mechanism",
  "common_side_effects": ["side effect 1", "side effect 2"],
  "serious_side_effects": ["serious effect 1"],
  "contraindications": ["condition 1"],
  "warnings": ["warning 1"],
  "disclaimer": "Always consult your doctor or pharmacist before taking any medication."
}}

IMPORTANT: Do NOT recommend dosages. Do NOT prescribe. Information only.
"""
        response = self.provider.generate(prompt)
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, AttributeError):
            pass
        return {'error': 'Unable to retrieve medication information. Please consult a pharmacist.'}
