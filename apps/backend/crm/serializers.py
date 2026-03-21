from rest_framework import serializers

from .models import Lead, Task


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "id",
            "name",
            "email",
            "phone",
            "source",
            "stage",
            "value",
            "notes",
            "assigned_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "lead",
            "title",
            "description",
            "due_date",
            "status",
            "assigned_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
