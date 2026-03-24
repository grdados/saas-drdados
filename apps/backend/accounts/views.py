from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import get_current_company
from .serializers import CompanySerializer, MeUpdateSerializer, RegisterSerializer, UserProfileSerializer
from .models import UserProfile


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Usuário criado com sucesso."}, status=status.HTTP_201_CREATED)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = get_current_company(request.user)
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(
            {
                "id": request.user.id,
                "name": request.user.first_name or request.user.username,
                "email": request.user.email,
                "company": CompanySerializer(company).data if company else None,
                "profile": UserProfileSerializer(profile).data,
            }
        )

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = MeUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        avatar_url = serializer.validated_data.get("avatar_url")
        if avatar_url is not None:
            profile.avatar_url = avatar_url
            profile.save(update_fields=["avatar_url", "updated_at"])
        return Response({"profile": UserProfileSerializer(profile).data})
