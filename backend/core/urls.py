from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check),
    path('api/auth/', include('apps.users.urls')),
    path('api/patients/', include('apps.patients.urls')),
    path('api/doctors/', include('apps.doctors.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/messages/', include('apps.messaging.urls')),
    path('api/ai/', include('apps.ai_engine.urls')),
    path('api/emergency/', include('apps.emergency.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/admin-panel/', include('apps.admin_panel.urls')),
    path('auth/', include('social_django.urls', namespace='social')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
