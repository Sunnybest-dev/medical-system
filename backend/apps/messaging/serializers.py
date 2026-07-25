from rest_framework import serializers
from .models import Conversation, Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.full_name', read_only=True)
    sender_avatar = serializers.CharField(source='sender.avatar', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'
        read_only_fields = ['id', 'sender', 'created_at']


class ConversationPatientSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField()
    avatar = serializers.CharField()


class ConversationDoctorUserSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar = serializers.CharField()


class ConversationDoctorSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    user = ConversationDoctorUserSerializer()
    specialization = serializers.SerializerMethodField()

    def get_specialization(self, obj):
        if obj.specialization:
            return {'name': obj.specialization.name}
        return None


class ConversationSerializer(serializers.ModelSerializer):
    patient = ConversationPatientSerializer(read_only=True)
    doctor = ConversationDoctorSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = '__all__'
        read_only_fields = ['id', 'patient', 'created_at']

    def get_last_message(self, obj):
        msg = obj.messages.last()
        return MessageSerializer(msg).data if msg else None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request:
            return obj.messages.filter(is_read=False).exclude(sender=request.user).count()
        return 0
