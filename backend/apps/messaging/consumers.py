import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        # Verify user belongs to this conversation
        if not await self.user_in_conversation():
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', 'message')

        if message_type == 'message':
            content = data.get('content', '').strip()
            if not content:
                return

            message = await self.save_message(content)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message_id': str(message.id),
                    'content': message.content,
                    'sender_id': str(self.user.id),
                    'sender_name': self.user.full_name,
                    'created_at': message.created_at.isoformat(),
                }
            )
        elif message_type == 'typing':
            await self.channel_layer.group_send(
                self.room_group_name,
                {'type': 'typing_indicator', 'user_id': str(self.user.id), 'is_typing': data.get('is_typing', False)}
            )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({'type': 'message', **event}))

    async def typing_indicator(self, event):
        if str(self.user.id) != event['user_id']:
            await self.send(text_data=json.dumps({'type': 'typing', **event}))

    @database_sync_to_async
    def user_in_conversation(self):
        from apps.users.models import User
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            return (self.user == conv.patient or
                    (self.user.role == User.Role.DOCTOR and conv.doctor.user == self.user))
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        conv = Conversation.objects.get(id=self.conversation_id)
        msg = Message.objects.create(conversation=conv, sender=self.user, content=content)
        conv.last_message_at = timezone.now()
        conv.save()
        return msg
