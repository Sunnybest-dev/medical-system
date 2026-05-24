import google.generativeai as genai
from django.conf import settings
import json
import re


class GeminiProvider:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            settings.GEMINI_MODEL or 'gemini-1.5-flash'
        )

    def generate(self, prompt: str) -> str:
        response = self.model.generate_content(prompt)
        return response.text


class AIProviderFactory:
    """Factory for AI providers - easily swap between Gemini, OpenAI, Claude"""
    _providers = {'gemini': GeminiProvider}

    @classmethod
    def get_provider(cls, provider_name: str = 'gemini'):
        provider_class = cls._providers.get(provider_name, GeminiProvider)
        return provider_class()

    @classmethod
    def register_provider(cls, name: str, provider_class):
        cls._providers[name] = provider_class


class HealthAssessmentService:
    DISCLAIMER = (
        "CRITICAL: You are an AI health information assistant. "
        "NEVER use the word 'diagnosis' or 'diagnose'. "
        "Always use 'possible conditions' instead. "
        "Always include a medical disclaimer. "
        "This is for informational purposes only."
    )

    def __init__(self):
        self.provider = AIProviderFactory.get_provider()

    def get_followup_questions(self, symptoms: list) -> list:
        symptom_list = ', '.join(symptoms)
        prompt = f"""
{self.DISCLAIMER}

A patient reports these symptoms: {symptom_list}

Generate 4-5 relevant follow-up questions to better understand their condition.
Return ONLY a JSON array of question strings. Example:
["How long have you had these symptoms?", "Rate your pain from 1-10"]
"""
        response = self.provider.generate(prompt)
        try:
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, AttributeError):
            pass
        return [
            "How long have you had these symptoms?",
            "How would you rate the severity (1-10)?",
            "Do you have any existing medical conditions?",
            "Are you currently taking any medications?",
        ]

    def perform_assessment(self, symptoms: list, followup_answers: dict, patient_info: dict = None) -> dict:
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

        prompt = f"""
{self.DISCLAIMER}

{patient_context}

Reported Symptoms: {symptom_list}

Follow-up Information:
{answers_text}

Provide a health assessment in the following JSON format ONLY:
{{
  "severity_level": "green|yellow|red",
  "severity_reason": "Brief explanation of severity",
  "possible_conditions": [
    {{"name": "Condition Name", "likelihood": "high|medium|low", "description": "Brief description"}}
  ],
  "suggested_specialist": "Type of specialist (e.g., General Practitioner, Cardiologist)",
  "recommendations": "Specific actionable recommendations",
  "when_to_seek_emergency": "Signs that require immediate emergency care",
  "general_care_tips": ["tip1", "tip2"],
  "disclaimer": "This assessment is for informational purposes only and does NOT constitute a medical diagnosis. Please consult a qualified healthcare professional."
}}

SEVERITY RULES:
- RED: Chest pain, difficulty breathing, stroke symptoms, severe bleeding, unconsciousness, seizures
- YELLOW: Persistent fever >3 days, repeated vomiting, moderate pain, worsening symptoms
- GREEN: Mild symptoms, common cold, minor headache, manageable conditions

NEVER use the word "diagnosis". Always use "possible conditions".
"""
        response = self.provider.generate(prompt)
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                result['disclaimer'] = (
                    "IMPORTANT MEDICAL DISCLAIMER: This AI health assessment is for informational purposes only. "
                    "It does NOT constitute a medical diagnosis. The 'possible conditions' listed are NOT confirmed diagnoses. "
                    "Always consult a qualified healthcare professional for proper medical evaluation and treatment. "
                    "In case of emergency, call your local emergency services immediately."
                )
                return result
        except (json.JSONDecodeError, AttributeError):
            pass

        return self._fallback_assessment(symptoms)

    def _fallback_assessment(self, symptoms: list) -> dict:
        emergency_symptoms = ['chest pain', 'difficulty breathing', 'stroke', 'seizure', 'severe bleeding']
        is_emergency = any(s.lower() in emergency_symptoms for s in symptoms)
        return {
            "severity_level": "red" if is_emergency else "yellow",
            "severity_reason": "Emergency symptoms detected" if is_emergency else "Unable to complete full assessment",
            "possible_conditions": [],
            "suggested_specialist": "Emergency Medicine" if is_emergency else "General Practitioner",
            "recommendations": "Please consult a healthcare professional immediately." if is_emergency else "Please consult a doctor for proper evaluation.",
            "when_to_seek_emergency": "If symptoms worsen, seek emergency care immediately.",
            "general_care_tips": [],
            "disclaimer": "This assessment is for informational purposes only and does NOT constitute a medical diagnosis."
        }

    def get_medication_info(self, medication_name: str) -> dict:
        prompt = f"""
Provide factual information about the medication: {medication_name}

Return ONLY this JSON format:
{{
  "name": "Medication name",
  "generic_name": "Generic name if applicable",
  "drug_class": "Drug classification",
  "purpose": "What it is commonly used for",
  "how_it_works": "Brief mechanism",
  "common_side_effects": ["side effect 1", "side effect 2"],
  "serious_side_effects": ["serious effect 1"],
  "contraindications": ["condition 1", "condition 2"],
  "warnings": ["warning 1", "warning 2"],
  "disclaimer": "This information is for educational purposes only. Always consult your doctor or pharmacist before taking any medication."
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
