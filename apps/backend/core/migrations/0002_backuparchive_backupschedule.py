from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_userprofile"),
        ("core", "0001_project_inquiry"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BackupArchive",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("source", models.CharField(choices=[("manual", "Manual"), ("scheduled", "Scheduled")], default="manual", max_length=20)),
                ("filename", models.CharField(max_length=255)),
                ("storage_path", models.CharField(max_length=500)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("checksum_sha256", models.CharField(max_length=64)),
                ("payload_checksum_sha256", models.CharField(max_length=64)),
                ("manifest", models.JSONField(blank=True, default=dict)),
                ("restore_count", models.PositiveIntegerField(default=0)),
                ("last_restored_at", models.DateTimeField(blank=True, null=True)),
                ("latest_restore_status", models.CharField(choices=[("never", "Never"), ("success", "Success"), ("failed", "Failed")], default="never", max_length=20)),
                ("latest_restore_message", models.TextField(blank=True, default="")),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="backup_archives", to="accounts.company")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_backup_archives", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BackupSchedule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("enabled", models.BooleanField(default=False)),
                ("frequency", models.CharField(choices=[("daily", "Daily"), ("weekly", "Weekly")], default="daily", max_length=20)),
                ("weekday", models.PositiveSmallIntegerField(default=0)),
                ("run_hour", models.PositiveSmallIntegerField(default=2)),
                ("run_minute", models.PositiveSmallIntegerField(default=0)),
                ("keep_last_n", models.PositiveSmallIntegerField(default=10)),
                ("last_run_at", models.DateTimeField(blank=True, null=True)),
                ("next_run_at", models.DateTimeField(blank=True, null=True)),
                ("company", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="backup_schedule", to="accounts.company")),
            ],
            options={
                "ordering": ["company_id"],
            },
        ),
        migrations.AddIndex(
            model_name="backuparchive",
            index=models.Index(fields=["company", "created_at"], name="core_backup_company_created_idx"),
        ),
    ]
