from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import serializers

from .models import Company, UserCompany


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    company_name = serializers.CharField(max_length=180)

    def validate_email(self, value: str) -> str:
        email = (value or "").strip().lower()
        if User.objects.filter(username=email).exists() or User.objects.filter(email=email).exists():
            raise serializers.ValidationError("E-mail ja cadastrado. Use outro e-mail ou faca login.")
        return email

    def create(self, validated_data):
        with transaction.atomic():
            email = validated_data["email"].strip().lower()
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=validated_data["name"],
                password=validated_data["password"],
            )
            company = Company.objects.create(name=validated_data["company_name"])
            UserCompany.objects.create(user=user, company=company, role=UserCompany.Role.OWNER)
            return user


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "trade_name",
            "document",
            "license_status",
            "asaas_customer_id",
            "created_at",
            "updated_at",
        ]
