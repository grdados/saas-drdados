from django.core.management.base import BaseCommand

from core.backup_utils import run_due_backup_schedules


class Command(BaseCommand):
    help = "Executa backups automaticos agendados que estiverem vencidos."

    def handle(self, *args, **options):
        processed = run_due_backup_schedules()
        self.stdout.write(self.style.SUCCESS(f"Backups agendados executados: {processed}"))
