from django.urls import path

from .backup_views import (
    BackupArchiveCreateView,
    BackupArchiveDownloadView,
    BackupArchiveListView,
    BackupArchiveRestoreView,
    BackupScheduleView,
)
from .views import healthcheck, project_intake

urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("public/project-intake/", project_intake, name="project_intake"),
    path("backups/archives/", BackupArchiveListView.as_view(), name="backup_archives"),
    path("backups/archives/create/", BackupArchiveCreateView.as_view(), name="backup_archive_create"),
    path("backups/archives/<int:archive_id>/download/", BackupArchiveDownloadView.as_view(), name="backup_archive_download"),
    path("backups/archives/<int:archive_id>/restore/", BackupArchiveRestoreView.as_view(), name="backup_archive_restore"),
    path("backups/schedule/", BackupScheduleView.as_view(), name="backup_schedule"),
]
