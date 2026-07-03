from django.test import TestCase

from apps.regions.models import IndonesiaRegion


class RegionModelTests(TestCase):
    def test_slug_auto_generated_from_name(self):
        r = IndonesiaRegion.objects.create(
            name="Bandar Lampung", latitude=-5.4, longitude=105.3,
        )
        self.assertEqual(r.slug, "bandar-lampung")

    def test_explicit_slug_preserved(self):
        r = IndonesiaRegion.objects.create(
            name="Jakarta", slug="dki-jakarta", latitude=-6.2, longitude=106.8,
        )
        self.assertEqual(r.slug, "dki-jakarta")
