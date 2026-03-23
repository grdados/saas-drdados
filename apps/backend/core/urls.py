from django.urls import path

from .views import healthcheck, project_intake

urlpatterns = [
    path("health/", healthcheck, name="healthcheck"),
    path("public/project-intake/", project_intake, name="project_intake"),
]
