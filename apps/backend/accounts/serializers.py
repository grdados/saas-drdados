from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Company, UserCompany


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    company_name = serializers.CharField(max_length=180)

    def create(self, validated_data):
        username = validated_data["email"].lower()
        user = User.objects.create_user(
            username=username,
            email=validated_data["email"].lower(),
            first_name=validated_data["name"],
            password=validated_data["password"],
        )
        company = Company.objects.create(name=validated_data["company_name"])
        UserCompany.objects.create(user=user, company=company, role=UserCompany.Role.OWNER)
        return user


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "trade_name", "document", "license_status", "created_at", "updated_at"]
