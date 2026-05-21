from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .models import Symptom, SymptomCategory, MedicalRule, CustomSymptom
from apps.drugs.models import Drug
from apps.reports.models import MedicalReport
from apps.api_integration.services import MedicalAPIService

@login_required
def symptom_checker_view(request):
    """Main symptom checker interface"""
    categories = SymptomCategory.objects.prefetch_related('symptoms').all()
    
    if request.method == 'POST':
        return process_symptoms(request)
    
    context = {
        'categories': categories,
    }
    return render(request, 'symptoms/checker.html', context)

def process_symptoms(request):
    """Process submitted symptoms and generate recommendations"""
    try:
        # Get selected symptoms
        selected_symptom_ids = request.POST.getlist('selected_symptoms')
        custom_symptom_text = request.POST.get('custom_symptoms', '').strip()
        
        if not selected_symptom_ids and not custom_symptom_text:
            messages.error(request, 'Please select symptoms or describe your condition.')
            return redirect('symptoms:checker')
        
        # Get selected symptoms
        selected_symptoms = Symptom.objects.filter(id__in=selected_symptom_ids)
        
        # Process custom symptoms
        custom_symptom = None
        if custom_symptom_text:
            custom_symptom = CustomSymptom.objects.create(
                user=request.user,
                description=custom_symptom_text
            )
            # Analyze custom symptoms and match to existing ones
            analyzed_symptoms = analyze_custom_symptoms(custom_symptom_text)
            custom_symptom.analyzed_keywords = analyzed_symptoms
            custom_symptom.save()
        
        # Find matching medical rules
        matched_rule = find_matching_rule(selected_symptoms, custom_symptom)
        
        # Get drug recommendations
        if matched_rule:
            recommended_drugs = matched_rule.recommended_drugs.all()
            condition_name = matched_rule.condition_name
            warning_message = matched_rule.warning_message
        else:
            # Default recommendations for unmatched symptoms
            recommended_drugs = Drug.objects.filter(is_general_use=True)[:3]
            condition_name = "General Symptoms"
            warning_message = "No specific condition pattern identified. Please consult a healthcare professional for proper evaluation."
        
        # Enhance drug information with API data
        api_service = MedicalAPIService()
        enhanced_drugs = []
        for drug in recommended_drugs:
            api_data = api_service.get_drug_information(drug.name)
            enhanced_drugs.append({
                'drug': drug,
                'api_data': api_data
            })
        
        # Create medical report
        report = MedicalReport.objects.create(
            user=request.user,
            selected_symptoms=list(selected_symptoms.values_list('name', flat=True)),
            custom_symptom_text=custom_symptom_text,
            condition_found=condition_name,
            recommended_drugs=list(recommended_drugs.values_list('name', flat=True)),
            warning_message=warning_message,
            matched_rule=matched_rule
        )
        
        context = {
            'report': report,
            'selected_symptoms': selected_symptoms,
            'custom_symptom': custom_symptom,
            'condition_name': condition_name,
            'enhanced_drugs': enhanced_drugs,
            'warning_message': warning_message,
        }
        
        return render(request, 'symptoms/results.html', context)
        
    except Exception as e:
        messages.error(request, f'An error occurred while processing your symptoms: {str(e)}')
        return redirect('symptoms:checker')

def find_matching_rule(selected_symptoms, custom_symptom=None):
    """Find the best matching medical rule for given symptoms"""
    rules = MedicalRule.objects.filter(is_active=True).prefetch_related('symptoms')
    
    best_match = None
    best_score = 0
    
    for rule in rules:
        rule_symptoms = set(rule.symptoms.all())
        selected_symptoms_set = set(selected_symptoms)
        
        if rule_symptoms:
            match_count = len(rule_symptoms.intersection(selected_symptoms_set))
            match_percentage = match_count / len(rule_symptoms)
            
            if match_percentage >= rule.confidence_threshold and match_percentage > best_score:
                best_match = rule
                best_score = match_percentage
    
    return best_match

def analyze_custom_symptoms(symptom_text):
    """Analyze custom symptom text and extract keywords"""
    # Simple keyword analysis - can be enhanced with NLP
    symptom_keywords = {
        'pain': ['pain', 'ache', 'hurt', 'sore', 'tender'],
        'fever': ['fever', 'hot', 'temperature', 'chills', 'sweating'],
        'nausea': ['nausea', 'sick', 'vomit', 'queasy', 'throw up'],
        'cough': ['cough', 'coughing', 'throat', 'chest'],
        'fatigue': ['tired', 'weak', 'fatigue', 'exhausted', 'energy'],
        'digestive': ['stomach', 'belly', 'diarrhea', 'constipation', 'bowel'],
        'headache': ['headache', 'head', 'migraine'],
        'respiratory': ['breathing', 'breath', 'lungs', 'airways']
    }
    
    text_lower = symptom_text.lower()
    detected_categories = []
    
    for category, keywords in symptom_keywords.items():
        for keyword in keywords:
            if keyword in text_lower:
                detected_categories.append(category)
                break
    
    return list(set(detected_categories))

@csrf_exempt
def get_symptoms_ajax(request):
    """AJAX endpoint to get symptoms by category"""
    if request.method == 'GET':
        category_id = request.GET.get('category_id')
        if category_id:
            symptoms = Symptom.objects.filter(
                category_id=category_id, 
                is_active=True
            ).values('id', 'name', 'description')
            return JsonResponse({'symptoms': list(symptoms)})
    
    return JsonResponse({'error': 'Invalid request'}, status=400)