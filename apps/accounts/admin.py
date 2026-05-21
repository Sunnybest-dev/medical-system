from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'age', 'gender', 'is_medical_admin', 'date_joined')
    list_filter = ('is_medical_admin', 'gender', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('username', 'first_name', 'last_name', 'email')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Medical Information', {
            'fields': ('phone', 'age', 'gender', 'is_medical_admin')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Medical Information', {
            'fields': ('phone', 'age', 'gender', 'is_medical_admin')
        }),
    )