from rest_framework import permissions, viewsets

from accounts.permissions import HasActiveLicense, get_current_company

from .models import Lead, Task
from .serializers import LeadSerializer, TaskSerializer


class CompanyScopedViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, HasActiveLicense]

    def get_company(self):
        return get_current_company(self.request.user)

    def get_queryset(self):
        company = self.get_company()
        if not company:
            return self.queryset.none()
        return self.queryset.filter(company=company)

    def perform_create(self, serializer):
        serializer.save(company=self.get_company())


class LeadViewSet(CompanyScopedViewSet):
    queryset = Lead.objects.select_related("company", "assigned_to")
    serializer_class = LeadSerializer


class TaskViewSet(CompanyScopedViewSet):
    queryset = Task.objects.select_related("company", "lead", "assigned_to")
    serializer_class = TaskSerializer
