import google.generativeai as genai
from django.conf import settings
import json
import re
import logging
import requests

logger = logging.getLogger(__name__)


class InfermedicaProvider:
    """
    Primary medical AI — Infermedica symptom checker API.
    Docs: https://developer.infermedica.com/docs
    Free tier: 100 calls/month on production; sandbox is unlimited but returns test data.
    """
    BASE = 'https://api.infermedica.com/v3'

    # Infermedica triage level → our severity_level
    TRIAGE_MAP = {
        'emergency': 'red',
        'emergency_ambulance': 'red',
        'consultation_24': 'yellow',
        'consultation': 'yellow',
        'self_care': 'green',
    }

    # Infermedica specialist → readable name
    SPECIALIST_MAP = {
        'general_practitioner': 'General Practitioner',
        'internist': 'Internal Medicine',
        'cardiologist': 'Cardiologist',
        'pulmonologist': 'Pulmonologist',
        'neurologist': 'Neurologist',
        'gastroenterologist': 'Gastroenterologist',
        'dermatologist': 'Dermatologist',
        'orthopedist': 'Orthopaedic Surgeon',
        'gynecologist': 'Gynaecologist',
        'urologist': 'Urologist',
        'ophthalmologist': 'Ophthalmologist',
        'otolaryngologist': 'ENT Specialist',
        'psychiatrist': 'Psychiatrist',
        'endocrinologist': 'Endocrinologist',
        'rheumatologist': 'Rheumatologist',
        'allergist': 'Allergist / Immunologist',
        'emergency_medicine': 'Emergency Medicine',
    }

    def __init__(self):
        self.available = False
        self.app_id = getattr(settings, 'INFERMEDICA_APP_ID', '')
        self.app_key = getattr(settings, 'INFERMEDICA_APP_KEY', '')
        if self.app_id and self.app_key:
            self.available = True
        else:
            logger.warning('INFERMEDICA_APP_ID / INFERMEDICA_APP_KEY not set — falling back to Gemini.')

    def _headers(self):
        return {
            'App-Id': self.app_id,
            'App-Key': self.app_key,
            'Content-Type': 'application/json',
            'Interview-Id': 'mediai-session',
        }

    def _post(self, path: str, payload: dict) -> dict | None:
        try:
            res = requests.post(
                f'{self.BASE}{path}',
                headers=self._headers(),
                json=payload,
                timeout=10,
            )
            if res.status_code == 402:
                logger.warning('Infermedica quota exceeded — falling back to Gemini.')
                return None
            if not res.ok:
                logger.warning(f'Infermedica {path} returned {res.status_code}: {res.text[:200]}')
                return None
            return res.json()
        except Exception as e:
            logger.warning(f'Infermedica {path} error: {e}')
            return None

    def search_symptoms(self, symptom_names: list, age: int = 30, sex: str = 'male') -> list:
        """Convert symptom name strings → list of {id, name} Infermedica concepts."""
        found = []
        for name in symptom_names:
            try:
                res = requests.get(
                    f'{self.BASE}/search',
                    headers=self._headers(),
                    params={'phrase': name, 'age.value': age, 'sex': sex, 'max_results': 3, 'types': 'symptom'},
                    timeout=8,
                )
                if res.ok:
                    results = res.json()
                    if results:
                        found.append({'id': results[0]['id'], 'name': results[0]['label']})
            except Exception as e:
                logger.warning(f'Infermedica search failed for "{name}": {e}')
        return found

    def get_suggest_questions(self, symptom_ids: list, age: int = 30, sex: str = 'male') -> list:
        """Use Infermedica /suggest to get the most relevant next symptoms to ask about."""
        if not symptom_ids:
            return []
        evidence = [{'id': sid, 'choice_id': 'present'} for sid in symptom_ids]
        data = self._post('/suggest', {
            'sex': sex,
            'age': {'value': age},
            'evidence': evidence,
            'suggest_method': 'symptoms',
            'max_results': 5,
        })
        if not data:
            return []
        # Convert suggested symptoms into plain questions
        questions = []
        for item in data:
            name = item.get('name', item.get('label', ''))
            if name:
                questions.append(f'Are you experiencing {name}?')
        return questions

    def diagnose(self, symptom_ids: list, age: int = 30, sex: str = 'male', extras: dict = None) -> dict | None:
        """Call /diagnosis and /triage, return unified result dict."""
        evidence = [{'id': sid, 'choice_id': 'present'} for sid in symptom_ids]
        payload = {
            'sex': sex,
            'age': {'value': age},
            'evidence': evidence,
            'extras': extras or {},
        }

        diagnosis = self._post('/diagnosis', payload)
        triage = self._post('/triage', payload)

        if not diagnosis:
            return None

        conditions = []
        for c in diagnosis.get('conditions', [])[:5]:
            prob = c.get('probability', 0)
            likelihood = 'high' if prob >= 0.5 else 'medium' if prob >= 0.2 else 'low'
            conditions.append({
                'name': c.get('name', ''),
                'likelihood': likelihood,
                'description': c.get('common_name', c.get('name', '')),
                'probability': round(prob * 100, 1),
            })

        triage_level = 'yellow'
        triage_desc = 'Please consult a doctor for a proper evaluation.'
        if triage:
            raw_level = triage.get('triage_level', 'consultation')
            triage_level = self.TRIAGE_MAP.get(raw_level, 'yellow')
            triage_desc = triage.get('description', triage_desc)

        # Specialist from triage recommended_channel or top condition
        specialist = 'General Practitioner'
        if triage:
            raw_spec = triage.get('recommended_channel', {}).get('type', '')
            specialist = self.SPECIALIST_MAP.get(raw_spec, 'General Practitioner')

        return {
            'possible_conditions': conditions,
            'severity_level': triage_level,
            'severity_reason': triage_desc,
            'suggested_specialist': specialist,
            'source': 'infermedica',
        }


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
        self.infermedica = InfermedicaProvider()
        self.gemini = GeminiProvider()
        self.fda = OpenFDAService()
        self.rxnorm = RxNormService()

    # ── Follow-up questions ───────────────────────────────────────────────────

    def get_followup_questions(self, symptoms: list, patient_info: dict = None) -> list:
        default_questions = [
            'How long have you had these symptoms?',
            'How would you rate the severity from 1 to 10?',
            'Do you have any existing medical conditions?',
            'Are you currently taking any medications?',
            'Have you experienced these symptoms before?',
        ]

        # Try Infermedica /suggest first
        if self.infermedica.available:
            age = (patient_info or {}).get('age') or 30
            sex = (patient_info or {}).get('gender', 'male')
            sex = sex if sex in ('male', 'female') else 'male'
            concepts = self.infermedica.search_symptoms(symptoms, age=age, sex=sex)
            if concepts:
                ids = [c['id'] for c in concepts]
                questions = self.infermedica.get_suggest_questions(ids, age=age, sex=sex)
                if questions:
                    return questions

        # Gemini fallback
        if not self.gemini.available:
            return default_questions

        symptom_list = ', '.join(symptoms)
        prompt = f"""You are a medical triage assistant. A patient reports: {symptom_list}

Generate 5 highly specific follow-up questions tailored EXACTLY to these symptoms.
Return ONLY a JSON array of 5 question strings:
["question 1", "question 2", "question 3", "question 4", "question 5"]
"""
        response = self.gemini.generate(prompt, max_output_tokens=512)
        try:
            match = re.search(r'\[.*\]', response, re.DOTALL)
            if match:
                return json.loads(match.group())
        except (json.JSONDecodeError, AttributeError):
            pass
        return default_questions

    # ── Main assessment ───────────────────────────────────────────────────────

    def perform_assessment(self, symptoms: list, followup_answers: dict, patient_info: dict = None) -> dict:
        age = (patient_info or {}).get('age') or 30
        sex = (patient_info or {}).get('gender', 'male')
        sex = sex if sex in ('male', 'female') else 'male'

        infermedica_result = None

        # ── Primary: Infermedica ──────────────────────────────────────────────
        if self.infermedica.available:
            concepts = self.infermedica.search_symptoms(symptoms, age=age, sex=sex)
            if concepts:
                ids = [c['id'] for c in concepts]
                infermedica_result = self.infermedica.diagnose(ids, age=age, sex=sex)

        # ── Secondary: Gemini (for summary, medications, care tips) ───────────
        gemini_result = self._gemini_assessment(symptoms, followup_answers, patient_info)

        # ── Merge: Infermedica conditions/severity + Gemini medications/summary
        if infermedica_result:
            result = {
                **gemini_result,
                # Infermedica wins on medical accuracy fields
                'possible_conditions': infermedica_result['possible_conditions'] or gemini_result.get('possible_conditions', []),
                'severity_level': infermedica_result['severity_level'],
                'severity_reason': infermedica_result['severity_reason'],
                'suggested_specialist': infermedica_result['suggested_specialist'],
                'source': 'infermedica+gemini' if gemini_result else 'infermedica',
            }
        else:
            result = gemini_result

        result['suggested_medications'] = self._enrich_medications(
            result.get('suggested_medications', [])
        )
        result['disclaimer'] = (
            'IMPORTANT MEDICAL DISCLAIMER: This assessment is for informational purposes only. '
            'It does NOT constitute a medical diagnosis. Always consult a qualified healthcare professional.'
        )
        return result

    def _gemini_assessment(self, symptoms: list, followup_answers: dict, patient_info: dict = None) -> dict:
        """Run Gemini assessment. Returns fallback dict if Gemini unavailable."""
        if not self.gemini.available:
            return self._fallback_assessment(symptoms)

        symptom_list = ', '.join(symptoms)
        answers_text = '\n'.join([f'- {q}: {a}' for q, a in followup_answers.items()])
        patient_context = ''
        if patient_info:
            patient_context = (
                f"\nPatient Context:\n"
                f"- Age: {patient_info.get('age', 'Unknown')}\n"
                f"- Gender: {patient_info.get('gender', 'Unknown')}\n"
                f"- Known conditions: {patient_info.get('existing_conditions', 'None')}\n"
                f"- Current medications: {patient_info.get('current_medications', 'None')}\n"
                f"- Allergies: {patient_info.get('allergies', 'None')}\n"
            )

        prompt = f"""You are a medical AI assistant. {patient_context}
Reported Symptoms: {symptom_list}

Follow-up Information:
{answers_text}

Return ONLY this JSON:
{{
  "severity_level": "green|yellow|red",
  "severity_reason": "Brief explanation",
  "possible_conditions": [
    {{"name": "Condition", "likelihood": "high|medium|low", "description": "Brief description"}}
  ],
  "suggested_specialist": "Specialist type",
  "recommendations": "Specific actionable recommendations",
  "when_to_seek_emergency": "Signs requiring immediate care",
  "general_care_tips": ["tip1", "tip2"],
  "suggested_medications": [
    {{"name": "generic name only", "purpose": "why relevant", "otc_or_prescription": "OTC or Prescription", "duration": "duration"}}
  ],
  "diagnosis_summary": "Plain-language summary for a non-medical person"
}}

RULES:
- suggested_medications: generic names only, max 3, OTC where safe.
- NEVER say 'diagnosis'. Use 'possible conditions'.
- Always recommend consulting a doctor before taking any medication.
- RED: chest pain, difficulty breathing, stroke, seizures, severe bleeding.
- YELLOW: persistent fever >3 days, moderate pain, worsening symptoms.
- GREEN: mild/common symptoms.
"""
        response = self.gemini.generate(prompt, max_output_tokens=4096)
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group())
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
        if self.gemini.available:
            prompt = f"""For the medication "{normalized_name}", return ONLY this JSON:
{{
  "purpose": "What it is used for (1-2 sentences)",
  "how_it_works": "Mechanism of action (1-2 sentences)"
}}
No dosage. No prescribing. Information only."""
            response = self.gemini.generate(prompt, max_output_tokens=256)
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

        if not self.gemini.available:
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
        response = self.gemini.generate(prompt, max_output_tokens=1024)
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
