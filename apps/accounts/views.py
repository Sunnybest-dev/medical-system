from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.generic import CreateView
from django.urls import reverse_lazy
from .models import User
from .forms import UserRegistrationForm, UserProfileForm

class UserRegistrationView(CreateView):
    model = User
    form_class = UserRegistrationForm
    template_name = 'accounts/register.html'
    success_url = reverse_lazy('accounts:login')

    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, 'Registration successful! You can now login.')
        return response

def login_view(request):
    """Custom login view with medical disclaimers"""
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            if user.is_medical_admin:
                return redirect('admin_dashboard')
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    
    return render(request, 'accounts/login.html')

@login_required
def profile_view(request):
    """User profile management"""
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('accounts:profile')
    else:
        form = UserProfileForm(instance=request.user)
    
    return render(request, 'accounts/profile.html', {'form': form})

@login_required
def dashboard_view(request):
    """User dashboard with medical system overview"""
    from apps.reports.models import MedicalReport
    
    # Get user statistics
    user_reports = MedicalReport.objects.filter(user=request.user)
    stats = {
        'total_reports': user_reports.count(),
        'recent_reports': user_reports.order_by('-created_at')[:5],
        'conditions_found': user_reports.exclude(condition_found__isnull=True).values_list('condition_found', flat=True).distinct()
    }
    
    return render(request, 'dashboard.html', {'stats': stats})