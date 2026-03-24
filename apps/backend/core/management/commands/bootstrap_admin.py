import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create/update an admin user from env vars (useful when host has no shell)."

    def handle(self, *args, **options):
        email = (os.getenv("DJANGO_ADMIN_EMAIL", "") or "").strip().lower()
        password = os.getenv("DJANGO_ADMIN_PASSWORD", "") or ""
        username = (os.getenv("DJANGO_ADMIN_USERNAME", "") or "").strip()

        if not email or not password:
            self.stdout.write("bootstrap_admin: skipped (DJANGO_ADMIN_EMAIL/PASSWORD not set).")
            return

        if not username:
            username = email

        User = get_user_model()

        # Default Django User uses username; in this template we also store email.
        user = User.objects.filter(username=username).first() or User.objects.filter(email=email).first()
        created = False
        if not user:
            user = User(username=username, email=email)
            created = True

        user.is_staff = True
        user.is_superuser = True
        # Keep the password out of logs; we only confirm the action.
        user.set_password(password)
        user.save()

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"bootstrap_admin: {action} admin user '{username}' ({email})."))

