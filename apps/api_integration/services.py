import requests
import logging
from django.core.cache import cache
from django.conf import settings
from typing import Dict, Optional
import json

logger = logging.getLogger(__name__)

class MedicalAPIService:
    """Service for integrating with medical APIs"""
    
    def __init__(self):
        self.fda_base_url = getattr(settings, 'FDA_API_BASE_URL', 'https://api.fda.gov/drug/label.json')
        self.rxnav_base_url = getattr(settings, 'RXNAV_API_BASE_URL', 'https://rxnav.nlm.nih.gov/REST')
        self.timeout = 10
        self.cache_timeout = 3600  # 1 hour

    def get_drug_information(self, drug_name: str) -> Dict:
        """Get comprehensive drug information from multiple APIs"""
        cache_key = f"drug_info_{drug_name.lower().replace(' ', '_')}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data

        # Try FDA API first
        fda_data = self._get_fda_drug_info(drug_name)
        if fda_data:
            cache.set(cache_key, fda_data, self.cache_timeout)
            return fda_data

        # Try RxNav API as fallback
        rxnav_data = self._get_rxnav_drug_info(drug_name)
        if rxnav_data:
            cache.set(cache_key, rxnav_data, self.cache_timeout)
            return rxnav_data

        # Return fallback data
        fallback_data = self._get_fallback_drug_info(drug_name)
        cache.set(cache_key, fallback_data, 300)  # Cache fallback for 5 minutes
        return fallback_data

    def _get_fda_drug_info(self, drug_name: str) -> Optional[Dict]:
        """Fetch drug information from FDA API"""
        try:
            params = {
                'search': f'openfda.brand_name:"{drug_name}"',
                'limit': 1
            }
            
            response = requests.get(
                self.fda_base_url,
                params=params,
                timeout=self.timeout,
                headers={'User-Agent': 'Medical System Academic Project'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'results' in data and data['results']:
                    result = data['results'][0]
                    return {
                        'drug_name': drug_name,
                        'description': self._extract_fda_description(result),
                        'dosage': self._extract_fda_dosage(result),
                        'side_effects': self._extract_fda_side_effects(result),
                        'contraindications': self._extract_fda_contraindications(result),
                        'warnings': self._extract_fda_warnings(result),
                        'source': 'FDA API',
                        'fda_approved': True
                    }
                    
        except requests.RequestException as e:
            logger.error(f"FDA API error for {drug_name}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in FDA API for {drug_name}: {e}")
            
        return None

    def _get_rxnav_drug_info(self, drug_name: str) -> Optional[Dict]:
        """Fetch drug information from RxNav API"""
        try:
            url = f"{self.rxnav_base_url}/drugs.json"
            params = {'name': drug_name}
            
            response = requests.get(
                url,
                params=params,
                timeout=self.timeout,
                headers={'User-Agent': 'Medical System Academic Project'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if 'drugGroup' in data and 'conceptGroup' in data['drugGroup']:
                    return {
                        'drug_name': drug_name,
                        'description': f"Medication information from RxNav database for {drug_name}",
                        'dosage': "Consult healthcare provider for proper dosage instructions",
                        'side_effects': "Consult healthcare provider or pharmacist for side effects information",
                        'contraindications': "Consult healthcare provider for contraindications and drug interactions",
                        'warnings': "Follow all healthcare provider instructions and package warnings",
                        'source': 'RxNav API',
                        'fda_approved': True
                    }
                    
        except requests.RequestException as e:
            logger.error(f"RxNav API error for {drug_name}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in RxNav API for {drug_name}: {e}")
            
        return None

    def _get_fallback_drug_info(self, drug_name: str) -> Dict:
        """Provide fallback drug information"""
        # Common medications database
        fallback_drugs = {
            'paracetamol': {
                'description': 'Pain reliever and fever reducer (acetaminophen)',
                'dosage': '500-1000mg every 4-6 hours, maximum 4g daily',
                'side_effects': 'Rare: skin rash, liver damage with overdose',
                'contraindications': 'Severe liver disease, alcohol dependency'
            },
            'acetaminophen': {
                'description': 'Pain reliever and fever reducer',
                'dosage': '500-1000mg every 4-6 hours, maximum 4g daily',
                'side_effects': 'Rare: skin rash, liver damage with overdose',
                'contraindications': 'Severe liver disease, alcohol dependency'
            },
            'ibuprofen': {
                'description': 'Nonsteroidal anti-inflammatory drug (NSAID)',
                'dosage': '200-400mg every 4-6 hours with food, maximum 1200mg daily',
                'side_effects': 'Stomach upset, dizziness, headache, increased bleeding risk',
                'contraindications': 'Stomach ulcers, kidney disease, heart problems, pregnancy (3rd trimester)'
            },
            'aspirin': {
                'description': 'Pain reliever, anti-inflammatory, and blood thinner',
                'dosage': '325-650mg every 4 hours as needed for pain/fever',
                'side_effects': 'Stomach irritation, increased bleeding, ringing in ears',
                'contraindications': 'Bleeding disorders, stomach ulcers, children under 16 (Reye syndrome risk)'
            },
            'amoxicillin': {
                'description': 'Penicillin antibiotic for bacterial infections',
                'dosage': '250-500mg every 8 hours or 500-875mg every 12 hours',
                'side_effects': 'Nausea, diarrhea, skin rash, allergic reactions',
                'contraindications': 'Penicillin allergy, severe kidney disease'
            }
        }
        
        drug_key = drug_name.lower().strip()
        if drug_key in fallback_drugs:
            drug_info = fallback_drugs[drug_key].copy()
            drug_info.update({
                'drug_name': drug_name,
                'source': 'Local Database',
                'fda_approved': False,
                'warnings': 'Always consult healthcare provider before taking any medication'
            })
            return drug_info
        
        # Generic fallback for unknown drugs
        return {
            'drug_name': drug_name,
            'description': f'Medication information for {drug_name}. Consult healthcare provider for detailed information.',
            'dosage': 'Follow healthcare provider instructions or package directions carefully',
            'side_effects': 'Consult healthcare provider or pharmacist for complete side effects information',
            'contraindications': 'Consult healthcare provider for contraindications and drug interactions',
            'warnings': 'Always consult healthcare provider before taking any medication',
            'source': 'Generic Information',
            'fda_approved': False
        }

    def _extract_fda_description(self, fda_result: Dict) -> str:
        """Extract description from FDA API result"""
        if 'description' in fda_result and fda_result['description']:
            return fda_result['description'][0][:500] + '...' if len(fda_result['description'][0]) > 500 else fda_result['description'][0]
        if 'purpose' in fda_result and fda_result['purpose']:
            return fda_result['purpose'][0]
        return 'FDA-approved medication'

    def _extract_fda_dosage(self, fda_result: Dict) -> str:
        """Extract dosage information from FDA API result"""
        if 'dosage_and_administration' in fda_result and fda_result['dosage_and_administration']:
            return fda_result['dosage_and_administration'][0][:300] + '...' if len(fda_result['dosage_and_administration'][0]) > 300 else fda_result['dosage_and_administration'][0]
        return 'Follow healthcare provider instructions'

    def _extract_fda_side_effects(self, fda_result: Dict) -> str:
        """Extract side effects from FDA API result"""
        if 'adverse_reactions' in fda_result and fda_result['adverse_reactions']:
            return fda_result['adverse_reactions'][0][:400] + '...' if len(fda_result['adverse_reactions'][0]) > 400 else fda_result['adverse_reactions'][0]
        return 'Consult healthcare provider for side effects information'

    def _extract_fda_contraindications(self, fda_result: Dict) -> str:
        """Extract contraindications from FDA API result"""
        if 'contraindications' in fda_result and fda_result['contraindications']:
            return fda_result['contraindications'][0][:300] + '...' if len(fda_result['contraindications'][0]) > 300 else fda_result['contraindications'][0]
        return 'Consult healthcare provider for contraindications'

    def _extract_fda_warnings(self, fda_result: Dict) -> str:
        """Extract warnings from FDA API result"""
        if 'warnings' in fda_result and fda_result['warnings']:
            return fda_result['warnings'][0][:300] + '...' if len(fda_result['warnings'][0]) > 300 else fda_result['warnings'][0]
        return 'Follow all package warnings and healthcare provider instructions'

    def check_api_status(self) -> Dict:
        """Check the status of medical APIs"""
        status = {
            'fda_api': self._check_fda_status(),
            'rxnav_api': self._check_rxnav_status(),
            'overall_status': 'operational'
        }
        
        if not status['fda_api']['available'] and not status['rxnav_api']['available']:
            status['overall_status'] = 'degraded'
        elif not status['fda_api']['available'] or not status['rxnav_api']['available']:
            status['overall_status'] = 'partial'
            
        return status

    def _check_fda_status(self) -> Dict:
        """Check FDA API availability"""
        try:
            response = requests.get(
                f"{self.fda_base_url}?search=openfda.brand_name:aspirin&limit=1",
                timeout=5
            )
            return {
                'available': response.status_code == 200,
                'response_time': response.elapsed.total_seconds(),
                'status_code': response.status_code
            }
        except:
            return {'available': False, 'response_time': None, 'status_code': None}

    def _check_rxnav_status(self) -> Dict:
        """Check RxNav API availability"""
        try:
            response = requests.get(
                f"{self.rxnav_base_url}/drugs.json?name=aspirin",
                timeout=5
            )
            return {
                'available': response.status_code == 200,
                'response_time': response.elapsed.total_seconds(),
                'status_code': response.status_code
            }
        except:
            return {'available': False, 'response_time': None, 'status_code': None}