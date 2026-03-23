from rest_framework import serializers

from .models import ProjectInquiry


class ProjectInquirySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectInquiry
        fields = [
            "id",
            "name",
            "company",
            "email",
            "whatsapp",
            "solution",
            "start_date",
            "company_size",
            "description",
            "has_system",
            "data_location",
            "data_access",
            "update_frequency",
            "data_structure",
            "objective",
            "budget_range",
            "needs_data_help",
            "score",
            "temperature",
            "meta",
            "created_at",
        ]
        read_only_fields = ["id", "score", "temperature", "created_at"]

