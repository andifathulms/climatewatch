from django.contrib import admin

from .models import IndonesiaRegion


@admin.register(IndonesiaRegion)
class IndonesiaRegionAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "type",
        "province",
        "latitude",
        "longitude",
        "is_featured",
    )
    list_filter = ("type", "is_featured", "province")
    search_fields = ("name", "province", "bps_code")
    prepopulated_fields = {"slug": ("name",)}
