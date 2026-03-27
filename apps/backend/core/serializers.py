from rest_framework import serializers

from .models import BackupArchive, BackupSchedule, ProjectInquiry


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


class BackupArchiveSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)

    class Meta:
        model = BackupArchive
        fields = [
            "id",
            "source",
            "filename",
            "file_size",
            "checksum_sha256",
            "payload_checksum_sha256",
            "manifest",
            "restore_count",
            "last_restored_at",
            "latest_restore_status",
            "latest_restore_message",
            "created_at",
            "created_by_email",
        ]
        read_only_fields = fields


class BackupScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BackupSchedule
        fields = [
            "enabled",
            "frequency",
            "weekday",
            "run_hour",
            "run_minute",
            "keep_last_n",
            "last_run_at",
            "next_run_at",
        ]
        read_only_fields = ["last_run_at", "next_run_at"]

    def validate_weekday(self, value: int) -> int:
        if value < 0 or value > 6:
            raise serializers.ValidationError("weekday deve estar entre 0 e 6.")
        return value

    def validate_run_hour(self, value: int) -> int:
        if value < 0 or value > 23:
            raise serializers.ValidationError("run_hour deve estar entre 0 e 23.")
        return value

    def validate_run_minute(self, value: int) -> int:
        if value < 0 or value > 59:
            raise serializers.ValidationError("run_minute deve estar entre 0 e 59.")
        return value

    def validate_keep_last_n(self, value: int) -> int:
        if value < 1 or value > 90:
            raise serializers.ValidationError("keep_last_n deve estar entre 1 e 90.")
        return value
