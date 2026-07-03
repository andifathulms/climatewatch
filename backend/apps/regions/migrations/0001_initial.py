from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="IndonesiaRegion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=120)),
                ("slug", models.SlugField(blank=True, max_length=140, unique=True)),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("provinsi", "Provinsi"),
                            ("kabupaten", "Kabupaten"),
                            ("kota", "Kota"),
                        ],
                        default="kota",
                        max_length=12,
                    ),
                ),
                ("latitude", models.FloatField()),
                ("longitude", models.FloatField()),
                ("province", models.CharField(blank=True, max_length=120)),
                ("bps_code", models.CharField(blank=True, max_length=16)),
                ("is_featured", models.BooleanField(default=False)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.AddIndex(
            model_name="indonesiaregion",
            index=models.Index(fields=["slug"], name="regions_ind_slug_idx"),
        ),
        migrations.AddIndex(
            model_name="indonesiaregion",
            index=models.Index(fields=["is_featured"], name="regions_ind_featured_idx"),
        ),
    ]
