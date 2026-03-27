from django.contrib import admin

from .models import BackupArchive, BackupSchedule, ProjectInquiry


@admin.register(ProjectInquiry)
class ProjectInquiryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "solution", "score", "temperature", "created_at")
    search_fields = ("name", "company", "email", "whatsapp")
    list_filter = ("solution", "temperature", "created_at")


@admin.register(BackupArchive)
class BackupArchiveAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "company",
        "filename",
        "source",
        "file_size",
        "restore_count",
        "latest_restore_status",
        "created_at",
    )
    search_fields = ("filename", "company__name", "created_by__email")
    list_filter = ("source", "latest_restore_status", "created_at")


@admin.register(BackupSchedule)
class BackupScheduleAdmin(admin.ModelAdmin):
    list_display = ("company", "enabled", "frequency", "weekday", "run_hour", "run_minute", "next_run_at")
    list_filter = ("enabled", "frequency", "weekday")
