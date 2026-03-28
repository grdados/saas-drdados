import hashlib
import json
import zipfile
from collections import defaultdict, deque
from datetime import timedelta
from pathlib import Path
from uuid import uuid4
import re

from django.apps import apps
from django.conf import settings
from django.core import serializers as django_serializers
from django.core.management.color import no_style
from django.db import connection, transaction
from django.utils import timezone

from accounts.models import Company, UserCompany, UserProfile

from .models import BackupArchive, BackupSchedule, ProjectInquiry


def get_backup_storage_dir() -> Path:
    base = Path(settings.BACKUP_STORAGE_DIR)
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_company_backup_dir(company: Company) -> Path:
    path = get_backup_storage_dir() / f"company_{company.id}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def iter_company_scoped_models():
    excluded = {Company, UserCompany, UserProfile, ProjectInquiry, BackupArchive, BackupSchedule}

    for model in apps.get_models():
        if model in excluded:
            continue

        has_company_fk = any(
            field.name == "company"
            and getattr(field, "remote_field", None)
            and field.remote_field.model is Company
            for field in model._meta.fields
        )

        if has_company_fk:
            yield model


def build_dependency_order(labels_to_models: dict[str, type]) -> list[str]:
    deps: dict[str, set[str]] = {}
    reverse: dict[str, set[str]] = defaultdict(set)

    for label, model in labels_to_models.items():
        current = set()
        for field in model._meta.fields:
            remote = getattr(field, "remote_field", None)
            remote_model = getattr(remote, "model", None)
            if not remote_model or remote_model is Company:
                continue

            remote_label = f"{remote_model._meta.app_label}.{remote_model.__name__}"
            if remote_label in labels_to_models:
                current.add(remote_label)
                reverse[remote_label].add(label)

        deps[label] = current

    queue = deque(sorted(label for label, values in deps.items() if not values))
    result: list[str] = []

    while queue:
        label = queue.popleft()
        result.append(label)
        for dependent in sorted(reverse.get(label, set())):
            deps[dependent].discard(label)
            if not deps[dependent]:
                queue.append(dependent)

    if len(result) != len(labels_to_models):
        return sorted(labels_to_models.keys())
    return result


def serialize_company_payload(company: Company) -> tuple[dict, dict[str, int]]:
    memberships = list(
        UserCompany.objects.select_related("user", "company").filter(company=company).order_by("id")
    )
    users = [membership.user for membership in memberships]
    profiles = list(UserProfile.objects.filter(user__in=users).order_by("user_id"))

    sections: dict[str, list] = {}
    counts: dict[str, int] = {}

    for model in iter_company_scoped_models():
        queryset = model.objects.filter(company=company).order_by("pk")
        label = f"{model._meta.app_label}.{model.__name__}"
        serialized = json.loads(django_serializers.serialize("json", queryset))
        sections[label] = serialized
        counts[label] = len(serialized)

    payload = {
        "company": {
            "id": company.id,
            "name": company.name,
            "trade_name": company.trade_name,
            "document": company.document,
            "license_status": company.license_status,
            "created_at": company.created_at.isoformat() if company.created_at else None,
            "updated_at": company.updated_at.isoformat() if company.updated_at else None,
        },
        "accounts": {
            "memberships": json.loads(django_serializers.serialize("json", memberships)),
            "users": [
                {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "is_active": user.is_active,
                    "is_staff": user.is_staff,
                    "date_joined": user.date_joined.isoformat() if user.date_joined else None,
                }
                for user in users
            ],
            "profiles": json.loads(django_serializers.serialize("json", profiles)),
        },
        "sections": sections,
    }

    return payload, counts


def compute_next_run(schedule: BackupSchedule, now=None):
    current = timezone.localtime(now or timezone.now())
    candidate = current.replace(
        hour=schedule.run_hour,
        minute=schedule.run_minute,
        second=0,
        microsecond=0,
    )

    if schedule.frequency == BackupSchedule.Frequency.DAILY:
        if candidate <= current:
            candidate = candidate + timedelta(days=1)
        return candidate

    days_ahead = (schedule.weekday - candidate.weekday()) % 7
    candidate = candidate + timedelta(days=days_ahead)
    if candidate <= current:
        candidate = candidate + timedelta(days=7)
    return candidate


def write_backup_zip(company: Company, payload: dict, counts: dict[str, int], created_by, source: str) -> BackupArchive:
    now = timezone.now()
    payload_text = json.dumps(payload, ensure_ascii=False, indent=2)
    payload_bytes = payload_text.encode("utf-8")
    payload_checksum = hashlib.sha256(payload_bytes).hexdigest()

    manifest = {
        "format": "grdados-company-backup",
        "version": 2,
        "generated_at": now.isoformat(),
        "company": {
            "id": company.id,
            "name": company.name,
            "trade_name": company.trade_name,
            "document": company.document,
            "license_status": company.license_status,
        },
        "payload_checksum_sha256": payload_checksum,
        "section_counts": counts,
        "restore_scope": "company_data",
        "notes": [
            "Backup multiempresa restrito a dados da empresa atual.",
            "Historico/agenda sao mantidos fora da restauracao para preservar trilha operacional.",
        ],
    }
    manifest_bytes = json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8")

    stamp = timezone.localtime(now).strftime("%Y%m%d-%H%M%S")
    filename = f"backup-company-{company.id}-{stamp}.zip"
    target = get_company_backup_dir(company) / filename

    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as archive_zip:
        archive_zip.writestr("manifest.json", manifest_bytes)
        archive_zip.writestr("data.json", payload_bytes)
        archive_zip.writestr("payload.sha256", f"{payload_checksum}  data.json\n".encode("utf-8"))

    file_bytes = target.read_bytes()
    archive_checksum = hashlib.sha256(file_bytes).hexdigest()

    return BackupArchive.objects.create(
        company=company,
        created_by=created_by,
        source=source,
        filename=filename,
        storage_path=str(target),
        file_size=target.stat().st_size,
        checksum_sha256=archive_checksum,
        payload_checksum_sha256=payload_checksum,
        manifest=manifest,
    )


def create_company_backup(company: Company, created_by=None, source: str = BackupArchive.Source.MANUAL) -> BackupArchive:
    payload, counts = serialize_company_payload(company)
    archive = write_backup_zip(company, payload, counts, created_by, source)
    prune_old_archives(company)
    return archive


def read_archive_payload(archive: BackupArchive) -> tuple[dict, dict]:
    path = Path(archive.storage_path)
    if not path.exists():
        raise FileNotFoundError("Arquivo de backup nao encontrado no armazenamento.")

    with zipfile.ZipFile(path, "r") as archive_zip:
        manifest = json.loads(archive_zip.read("manifest.json").decode("utf-8"))
        payload_bytes = archive_zip.read("data.json")
        checksum_line = archive_zip.read("payload.sha256").decode("utf-8").strip()

    payload_checksum = hashlib.sha256(payload_bytes).hexdigest()
    expected = manifest.get("payload_checksum_sha256", "")
    if expected != payload_checksum or not checksum_line.startswith(payload_checksum):
        raise ValueError("Checksum do backup invalido. O arquivo pode estar corrompido.")

    return manifest, json.loads(payload_bytes.decode("utf-8"))


def import_uploaded_backup(company: Company, uploaded_file, created_by=None) -> BackupArchive:
    original_name = Path(getattr(uploaded_file, "name", "backup.zip") or "backup.zip").name
    if not original_name.lower().endswith(".zip"):
        raise ValueError("Arquivo invalido. Envie um backup .zip.")

    target_name = f"upload-company-{company.id}-{timezone.localtime(timezone.now()).strftime('%Y%m%d-%H%M%S')}-{uuid4().hex[:8]}.zip"
    target = get_company_backup_dir(company) / target_name

    with target.open("wb") as destination:
        for chunk in uploaded_file.chunks():
            destination.write(chunk)

    try:
        file_bytes = target.read_bytes()
        archive_checksum = hashlib.sha256(file_bytes).hexdigest()

        with zipfile.ZipFile(target, "r") as archive_zip:
            manifest = json.loads(archive_zip.read("manifest.json").decode("utf-8"))
            payload_bytes = archive_zip.read("data.json")
            checksum_line = archive_zip.read("payload.sha256").decode("utf-8").strip()

        payload_checksum = hashlib.sha256(payload_bytes).hexdigest()
        expected = manifest.get("payload_checksum_sha256", "")
        if expected != payload_checksum or not checksum_line.startswith(payload_checksum):
            raise ValueError("Checksum do backup invalido. O arquivo pode estar corrompido.")

        return BackupArchive.objects.create(
            company=company,
            created_by=created_by,
            source=BackupArchive.Source.MANUAL,
            filename=original_name,
            storage_path=str(target),
            file_size=target.stat().st_size,
            checksum_sha256=archive_checksum,
            payload_checksum_sha256=payload_checksum,
            manifest=manifest,
        )
    except Exception:
        if target.exists():
            target.unlink()
        raise


def reset_sequences(models: list[type]) -> None:
    sql_statements = connection.ops.sequence_reset_sql(no_style(), models)

    with connection.cursor() as cursor:
        for statement in sql_statements:
            cursor.execute(statement)


def normalize_company_document(value: str | None) -> str:
    return re.sub(r"\D+", "", value or "")


def normalize_company_name(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).upper()


def restore_company_backup(archive: BackupArchive, target_company: Company) -> BackupArchive:
    manifest, payload = read_archive_payload(archive)
    backup_company = payload.get("company") or {}

    backup_company_id = int(backup_company.get("id", 0) or 0)
    same_id = backup_company_id == target_company.id

    backup_document = normalize_company_document(backup_company.get("document"))
    target_document = normalize_company_document(target_company.document)
    same_document = bool(backup_document and target_document and backup_document == target_document)

    backup_name = normalize_company_name(backup_company.get("name"))
    target_name = normalize_company_name(target_company.name)
    backup_trade_name = normalize_company_name(backup_company.get("trade_name"))
    target_trade_name = normalize_company_name(target_company.trade_name)
    same_name_fallback = bool(backup_name and target_name and backup_name == target_name)
    if backup_trade_name and target_trade_name:
        same_name_fallback = same_name_fallback and backup_trade_name == target_trade_name

    if not (same_id or same_document or same_name_fallback):
        raise ValueError("Este backup pertence a outra empresa e nao pode ser restaurado nesta conta.")

    sections: dict[str, list] = payload.get("sections") or {}
    label_to_model = {
        label: next(model for model in iter_company_scoped_models() if f"{model._meta.app_label}.{model.__name__}" == label)
        for label in sections.keys()
    }
    ordered_labels = build_dependency_order(label_to_model)

    with transaction.atomic():
        target_company.name = backup_company.get("name", target_company.name)
        target_company.trade_name = backup_company.get("trade_name", target_company.trade_name)
        target_company.document = backup_company.get("document", target_company.document)
        target_company.license_status = backup_company.get("license_status", target_company.license_status)
        target_company.save(update_fields=["name", "trade_name", "document", "license_status", "updated_at"])

        for label in reversed(ordered_labels):
            label_to_model[label].objects.filter(company=target_company).delete()

        restored_models: list[type] = []
        for label in ordered_labels:
            model = label_to_model[label]
            serialized_rows = sections.get(label, [])
            if not serialized_rows:
                continue

            for item in django_serializers.deserialize("json", json.dumps(serialized_rows)):
                instance = item.object
                if hasattr(instance, "company_id"):
                    instance.company_id = target_company.id
                item.save()
            restored_models.append(model)

        if restored_models:
            reset_sequences(restored_models)

        archive.restore_count += 1
        archive.last_restored_at = timezone.now()
        archive.latest_restore_status = BackupArchive.RestoreStatus.SUCCESS
        archive.latest_restore_message = (
            f"Restaurado com sucesso em {archive.last_restored_at.isoformat()} a partir do manifesto v{manifest.get('version', 1)}."
        )
        archive.save(
            update_fields=[
                "restore_count",
                "last_restored_at",
                "latest_restore_status",
                "latest_restore_message",
                "updated_at",
            ]
        )

    return archive


def prune_old_archives(company: Company) -> None:
    schedule = BackupSchedule.objects.filter(company=company).first()
    keep_last_n = schedule.keep_last_n if schedule else 10
    archives = list(company.backup_archives.order_by("-created_at"))
    for archive in archives[keep_last_n:]:
        path = Path(archive.storage_path)
        if path.exists():
            path.unlink()
        archive.delete()


def run_due_backup_schedules() -> int:
    now = timezone.now()
    processed = 0
    due_schedules = BackupSchedule.objects.select_related("company").filter(enabled=True, next_run_at__lte=now)

    for schedule in due_schedules:
        create_company_backup(schedule.company, created_by=None, source=BackupArchive.Source.SCHEDULED)
        schedule.last_run_at = now
        schedule.next_run_at = compute_next_run(schedule, now=now)
        schedule.save(update_fields=["last_run_at", "next_run_at", "updated_at"])
        processed += 1

    return processed
