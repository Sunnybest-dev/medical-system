from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()
channel_layer = get_channel_layer()


def push_notification(user_id, title, message, notification_type, action_url=''):
    notification = Notification.objects.create(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
    )
    async_to_sync(channel_layer.group_send)(
        f'notifications_{user_id}',
        {
            'type': 'notification_message',
            'title': title,
            'message': message,
            'notification_type': notification_type,
            'action_url': action_url,
        }
    )
    return notification


@shared_task
def send_appointment_notification(appointment_id, event_type):
    from apps.appointments.models import Appointment
    try:
        appt = Appointment.objects.select_related('patient', 'doctor__user').get(id=appointment_id)
        messages = {
            'created': ('New Appointment Request', f'Appointment request from {appt.patient.full_name}'),
            'confirmed': ('Appointment Confirmed', f'Your appointment with Dr. {appt.doctor.user.full_name} is confirmed'),
            'cancelled': ('Appointment Cancelled', 'An appointment has been cancelled'),
            'completed': ('Appointment Completed', 'Your consultation has been completed'),
        }
        title, message = messages.get(event_type, ('Appointment Update', 'Your appointment has been updated'))
        push_notification(appt.patient.id, title, message, 'appointment', f'/appointments/{appointment_id}')
        push_notification(appt.doctor.user.id, title, message, 'appointment', f'/appointments/{appointment_id}')
    except Appointment.DoesNotExist:
        logger.warning(f'send_appointment_notification: appointment {appointment_id} not found')
    except Exception as e:
        logger.exception(f'send_appointment_notification failed: {e}')


@shared_task
def send_emergency_notification(emergency_id):
    from apps.emergency.models import EmergencyRequest
    try:
        emergency = EmergencyRequest.objects.select_related('patient', 'assigned_doctor__user').get(id=emergency_id)
        if emergency.assigned_doctor:
            push_notification(
                emergency.assigned_doctor.user.id,
                '🚨 EMERGENCY REQUEST',
                f'Emergency: {emergency.get_emergency_type_display()} from {emergency.patient.full_name}',
                'emergency',
                f'/emergency/{emergency_id}'
            )
    except EmergencyRequest.DoesNotExist:
        logger.warning(f'send_emergency_notification: emergency {emergency_id} not found')
    except Exception as e:
        logger.exception(f'send_emergency_notification failed: {e}')
