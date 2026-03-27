from pathlib import Path

from django.http import FileResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsCompanyAdmin, get_current_company

from .backup_utils import compute_next_run, create_company_backup, restore_company_backup
from .models import BackupArchive, BackupSchedule
from .serializers import BackupArchiveSerializer, BackupScheduleSerializer


class BackupArchiveListView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get(self, request):
        company = get_current_company(request.user)
        archives = BackupArchive.objects.filter(company=company).order_by("-created_at")
        return Response(BackupArchiveSerializer(archives, many=True).data)


class BackupArchiveCreateView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def post(self, request):
        company = get_current_company(request.user)
        archive = create_company_backup(company=company, created_by=request.user)
        return Response(BackupArchiveSerializer(archive).data, status=status.HTTP_201_CREATED)


class BackupArchiveDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get(self, request, archive_id: int):
        company = get_current_company(request.user)
        archive = BackupArchive.objects.filter(company=company, id=archive_id).first()
        if not archive:
            return Response({"detail": "Backup nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        path = Path(archive.storage_path)
        if not path.exists():
            return Response({"detail": "Arquivo de backup nao encontrado no armazenamento."}, status=status.HTTP_404_NOT_FOUND)

        return FileResponse(path.open("rb"), as_attachment=True, filename=archive.filename, content_type="application/zip")


class BackupArchiveRestoreView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def post(self, request, archive_id: int):
        company = get_current_company(request.user)
        archive = BackupArchive.objects.filter(company=company, id=archive_id).first()
        if not archive:
            return Response({"detail": "Backup nao encontrado."}, status=status.HTTP_404_NOT_FOUND)

        try:
            archive = restore_company_backup(archive, target_company=company)
        except FileNotFoundError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as exc:
            archive.latest_restore_status = BackupArchive.RestoreStatus.FAILED
            archive.latest_restore_message = str(exc)
            archive.save(update_fields=["latest_restore_status", "latest_restore_message", "updated_at"])
            return Response({"detail": "Falha ao restaurar o backup."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(BackupArchiveSerializer(archive).data)


class BackupScheduleView(APIView):
    permission_classes = [IsAuthenticated, IsCompanyAdmin]

    def get_object(self, request):
        company = get_current_company(request.user)
        schedule, _ = BackupSchedule.objects.get_or_create(company=company)
        return schedule

    def get(self, request):
        schedule = self.get_object(request)
        return Response(BackupScheduleSerializer(schedule).data)

    def patch(self, request):
        schedule = self.get_object(request)
        serializer = BackupScheduleSerializer(instance=schedule, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        schedule = serializer.save()
        schedule.next_run_at = compute_next_run(schedule) if schedule.enabled else None
        schedule.save(update_fields=["enabled", "frequency", "weekday", "run_hour", "run_minute", "keep_last_n", "next_run_at", "updated_at"])
        return Response(BackupScheduleSerializer(schedule).data)
