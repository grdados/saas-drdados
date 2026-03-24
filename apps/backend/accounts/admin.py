from django.contrib import admin

from .models import Company, UserCompany, UserProfile

admin.site.register(Company)
admin.site.register(UserCompany)
admin.site.register(UserProfile)
