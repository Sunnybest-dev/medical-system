import google.generativeai as genai
from django.conf import settings
import json
import re
import logging
import requests

logger = logging.getLogger(__name__)


class RxNormService:
    BASE = 'https://rxnav.nlm.nih.gov/REST'

    def normalize(self, drug_name: str) -> dict:
        """Return rxcui, generic name, and brand names for a drug."""
        try:
            # Use approximateTerm to find the best matching rxcui
            res = requests.get(
                f'{self.BASE}/approximateTerm.json',
                params={'term': drug_name, 'maxEntries': 5},
                timeout=5,
            )
            rxcui = None
            if res.ok:
                candidates = res.json().get('approximateGroup', {}).get('candidate', [])
                # Prefer exact ingredient (IN) match
                for c in candidates:
                    if c.get('source') == 'RXNORM':
                        rxcui = c.get('rxcui')
                        break
                if not rxcui and candidates:
                    rxcui = candidates[0].get('rxcui')

            generic_name = drug_name
            brand_names = []

            if rxcui:
                # Get the ingredient name for this rxcui
                props_res = requests.get(
                    f'{self.BASE}/rxcui/{rxcui}/properties.json',
                    timeout=5,
                )
                if props_res.ok:
                    props = props_res.json().get('properties', {})
                    tty = props.get('tty', '')
                    name = props.get('name', '')
                    # If it's a compound/clinical drug, walk up to ingredient
                    if tty not in ('IN', 'PIN') and name:
                        ing_res = requests.get(
                            f'{self.BASE}/rxcui/{rxcui}/related.json',
                            params={'tty': 'IN'},
                            timeout=5,
                        )
                        if ing_res.ok:
                            ing_groups = ing_res.json().get('relatedGroup', {}).get('conceptGroup', [])
                            for g in ing_groups:
                                for p in g.get('conceptProperties', []):
                                    generic_name = p.get('name', drug_name)
                                    rxcui = p.get('rxcui', rxcui)
                                    break
                                break
                        else:
                            generic_name = name
                    else:
                        generic_name = name or drug_name

                # Get brand names
                bn_res = requests.get(
                    f'{self.BASE}/rxcui/{rxcui}/related.json',
                    params={'tty': 'BN'},
                    timeout=5,
                )
                if bn_res.ok:
                    for g in bn_res.json().get('relatedGroup', {}).get('conceptGroup', []):
                        for p in g.get('conceptProperties', []):
                            brand_names.append(p.get('name', ''))

            return {
                'rxcui': rxcui,
                'generic_name': generic_name or drug_name,
                'brand_names': list(dict.fromkeys(brand_names))[:6],
            }
        except Exception as e:
            logger.warning(f'RxNorm normalize failed for "{drug_name}": {e}')
            return {}

    def get_interactions(self, rxcuis: list) -> list:
        """Check drug-drug interactions for a list of rxcuis."""
        if len(rxcuis) < 2:
            return []
        try:
            res = requests.get(
                f'{self.BASE}/interaction/list.json',
                params={'rxcuis': '+'.join(rxcuis)},
                timeout=5,
            )
            if not res.ok:
                return []
            data = res.json()
            interactions = []
            for pair in data.get('fullInteractionTypeGroup', []):
                for interaction_type in pair.get('fullInteractionType', []):
                    desc = interaction_type.get('interactionPair', [{}])[0].get('description', '')
                    severity = interaction_type.get('interactionPair', [{}])[0].get('severity', '')
                    if desc:
                        interactions.append({'description': desc, 'severity': severity})
            return interactions[:5]
        except Exception as e:
            logger.warning(f'RxNorm interactions failed: {e}')
            return []


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
                getattr(settings, 'GEMINI_MODEL', 'gemini-1.5-flash'),
            )
            self.available = True
        except Exception as e:
            logger.error(f'Failed to initialise Gemini: {e}')

    def generate(self, prompt: str, max_output_tokens: int = 1024) -> str:
        if not self.available:
            return ''
        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    max_output_tokens=max_output_tokens,
                    temperature=0.3,
                ),
                request_options={'timeout': 30},
            )
            return response.text
        except Exception as e:
            logger.error(f'Gemini generate error: {e}')
            return ''


class OpenFDAService:
    BASE_URL = 'https://api.fda.gov/drug/label.json'

    def fetch(self, drug_name: str) -> dict | None:
        """Query OpenFDA by generic name first, then brand name."""
        for field in ('openfda.generic_name', 'openfda.brand_name'):
            try:
                res = requests.get(
                    self.BASE_URL,
                    params={'search': f'{field}:"{drug_name}"', 'limit': 1},
                    timeout=5,
                )
                if not res.ok:
                    continue
                results = res.json().get('results', [])
                if not results:
                    continue
                r = results[0]
                return {
                    'source': 'fda',
                    'name': r.get('openfda', {}).get('brand_name', [drug_name])[0],
                    'generic_name': r.get('openfda', {}).get('generic_name', [''])[0],
                    'drug_class': (
                        r.get('openfda', {}).get('pharm_class_epc', [''])[0] or
                        r.get('openfda', {}).get('product_type', [''])[0]
                    ),
                    'how_to_take': (r.get('dosage_and_administration') or [''])[0][:300] or None,
                    'common_side_effects': [
                        s.strip() for s in
                        re.split(r'[,;]', (r.get('adverse_reactions') or [''])[0])[:8]
                        if s.strip()
                    ],
                    'serious_side_effects': [
                        s.strip() for s in
                        ((r.get('warnings') or [''])[0]).split('.')[:4]
                        if len(s.strip()) > 10
                    ],
                    'contraindications': [
                        s.strip() for s in
                        ((r.get('contraindications') or [''])[0]).split('.')[:4]
                        if len(s.strip()) > 10
                    ],
                    'overdose_warning': (r.get('overdosage') or [''])[0][:300] or None,
                    'warnings': [
                        s.strip() for s in
                        ((r.get('boxed_warning') or [''])[0]).split('.')[:3]
                        if len(s.strip()) > 10
                    ],
                }
            except Exception as e:
                logger.warning(f'OpenFDA lookup failed for "{drug_name}": {e}')
        return None


class HealthAssessmentService:
    DISCLAIMER = (
        "CRITICAL: You are an AI health information assistant. "
        "NEVER use the word 'diagnosis' or 'diagnose'. "
        "Always use 'possible conditions' instead. "
        "This is for informational purposes only."
    )

    def __init__(self):
        self.provider = GeminiProvider()
        self.fda = OpenFDAService()
        self.rxnorm = RxNormService()

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
        response = self.provider.generate(prompt, max_output_tokens=512)
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
      "name": "Generic medication name only (e.g. ibuprofen, paracetamol, amoxicillin)",
      "purpose": "Why this medication is relevant to the patient's specific symptoms",
      "otc_or_prescription": "OTC or Prescription",
      "duration": "e.g. 5-7 days or as directed by doctor"
    }}
  ],
  "diagnosis_summary": "A plain-language summary of what the patient likely has based on symptoms and answers"
}}

SEVERITY RULES:
- RED: Chest pain, difficulty breathing, stroke symptoms, severe bleeding, unconsciousness, seizures
- YELLOW: Persistent fever >3 days, repeated vomiting, moderate pain, worsening symptoms
- GREEN: Mild symptoms, common cold, minor headache, manageable conditions

IMPORTANT RULES:
- For suggested_medications, use only the generic drug name so it can be looked up in a drug database.
- Suggest at most 3 medications. Only suggest safe OTC drugs where appropriate.
- diagnosis_summary must be written in simple language a non-medical person understands.
- NEVER use the word "diagnosis" in possible_conditions. Use "possible conditions".
- Always recommend consulting a doctor before taking any medication.
"""
        response = self.provider.generate(prompt, max_output_tokens=4096)
        try:
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                result['suggested_medications'] = self._enrich_medications(
                    result.get('suggested_medications', [])
                )
                result['disclaimer'] = (
                    "IMPORTANT MEDICAL DISCLAIMER: This AI health assessment is for informational purposes only. "
                    "It does NOT constitute a medical diagnosis. Always consult a qualified healthcare professional."
                )
                return result
        except (json.JSONDecodeError, AttributeError):
            pass

        return self._fallback_assessment(symptoms)

    def _enrich_medications(self, medications: list) -> list:
        """RxNorm normalize → OpenFDA enrich → collect interactions."""
        enriched = []
        rxcuis = []

        for med in medications:
            name = med.get('name', '')

            rx = self.rxnorm.normalize(name)
            normalized_name = rx.get('generic_name') or name
            rxcui = rx.get('rxcui')
            if rxcui:
                rxcuis.append(rxcui)

            fda_data = self.fda.fetch(normalized_name) or self.fda.fetch(name)

            if fda_data:
                enriched.append({
                    **med,
                    'source': 'fda',
                    'name': fda_data.get('name') or normalized_name,
                    'generic_name': rx.get('generic_name', '') or fda_data.get('generic_name', ''),
                    'brand_names': rx.get('brand_names', []),
                    'rxcui': rxcui,
                    'drug_class': fda_data.get('drug_class', ''),
                    'how_to_take': fda_data.get('how_to_take') or med.get('how_to_take', ''),
                    'common_side_effects': fda_data.get('common_side_effects', []),
                    'serious_side_effects': fda_data.get('serious_side_effects', []),
                    'contraindications': fda_data.get('contraindications', []),
                    'overdose_warning': fda_data.get('overdose_warning') or med.get('overdose_warning', ''),
                    'warnings': fda_data.get('warnings', []),
                })
            else:
                enriched.append({
                    **med,
                    'source': 'ai',
                    'generic_name': rx.get('generic_name', ''),
                    'brand_names': rx.get('brand_names', []),
                    'rxcui': rxcui,
                })

        interactions = self.rxnorm.get_interactions(rxcuis)
        if interactions:
            for item in enriched:
                item['drug_interactions'] = interactions

        return enriched

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
        """RxNorm normalize → OpenFDA → Gemini fallback for mechanism/purpose."""
        rx = self.rxnorm.normalize(medication_name)
        normalized_name = rx.get('generic_name') or medication_name
        rxcui = rx.get('rxcui')

        fda_data = self.fda.fetch(normalized_name) or self.fda.fetch(medication_name)

        ai_info = {}
        if self.provider.available:
            prompt = f"""For the medication "{normalized_name}", return ONLY this JSON:
{{
  "purpose": "What it is used for (1-2 sentences)",
  "how_it_works": "Mechanism of action (1-2 sentences)"
}}
No dosage. No prescribing. Information only."""
            response = self.provider.generate(prompt, max_output_tokens=256)
            try:
                match = re.search(r'\{.*\}', response, re.DOTALL)
                if match:
                    ai_info = json.loads(match.group())
            except (json.JSONDecodeError, AttributeError):
                pass

        if fda_data:
            return {
                'source': 'fda',
                'name': fda_data.get('name') or normalized_name,
                'generic_name': rx.get('generic_name', '') or fda_data.get('generic_name', ''),
                'brand_names': rx.get('brand_names', []),
                'rxcui': rxcui,
                'drug_class': fda_data.get('drug_class', ''),
                'purpose': ai_info.get('purpose', '') or fda_data.get('purpose', ''),
                'how_it_works': ai_info.get('how_it_works', '') or fda_data.get('how_it_works', ''),
                'how_to_take': fda_data.get('how_to_take', ''),
                'common_side_effects': fda_data.get('common_side_effects', []),
                'serious_side_effects': fda_data.get('serious_side_effects', []),
                'contraindications': fda_data.get('contraindications', []),
                'overdose_warning': fda_data.get('overdose_warning', ''),
                'warnings': fda_data.get('warnings', []),
                'disclaimer': 'This information is sourced from FDA and RxNorm databases. Always consult your doctor or pharmacist before taking any medication.',
            }

        if not self.provider.available:
            return {'error': 'AI service unavailable. Please consult a pharmacist.'}

        prompt = f"""Provide factual information about the medication: {medication_name}

Return ONLY this JSON:
{{
  "name": "Medication name",
  "generic_name": "Generic name",
  "drug_class": "Drug classification",
  "purpose": "What it is used for",
  "how_it_works": "Mechanism of action",
  "common_side_effects": ["effect 1", "effect 2"],
  "serious_side_effects": ["serious effect 1"],
  "contraindications": ["condition 1"],
  "warnings": ["warning 1"],
  "disclaimer": "Always consult your doctor or pharmacist before taking any medication."
}}
No dosage. No prescribing. Information only."""
        response = self.provider.generate(prompt, max_output_tokens=1024)
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                result = json.loads(match.group())
                result['source'] = 'ai'
                result['brand_names'] = rx.get('brand_names', [])
                result['rxcui'] = rxcui
                return result
        except (json.JSONDecodeError, AttributeError):
            pass
        return {'error': 'Unable to retrieve medication information. Please consult a pharmacist.'}
