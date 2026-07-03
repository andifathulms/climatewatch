import django.db.models.deletion
from django.db import migrations, models


def create_hypertable(apps, schema_editor):
    """Convert ClimateDaily into a TimescaleDB hypertable on `date`.

    No-op on non-PostgreSQL backends (e.g. SQLite in tests/CI), where the
    TimescaleDB `create_hypertable` function is unavailable.

    TimescaleDB requires every unique index on a hypertable to include the
    partitioning column. Django's default single-column `id` primary key does
    not, so we drop it first — the `id` identity column keeps auto-populating,
    and the (region, date) unique constraint (which includes `date`) remains
    for upserts. No table references ClimateDaily.id, so this is safe.
    """
    if schema_editor.connection.vendor != "postgresql":
        return
    schema_editor.execute(
        "ALTER TABLE climate_climatedaily "
        "DROP CONSTRAINT IF EXISTS climate_climatedaily_pkey;"
    )
    schema_editor.execute(
        "SELECT create_hypertable('climate_climatedaily', 'date', "
        "if_not_exists => TRUE, migrate_data => TRUE);"
    )


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("regions", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ClimateDaily",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("temp_max", models.FloatField(blank=True, null=True)),
                ("temp_min", models.FloatField(blank=True, null=True)),
                ("temp_mean", models.FloatField(blank=True, null=True)),
                ("precipitation_mm", models.FloatField(blank=True, null=True)),
                ("windspeed_max_kmh", models.FloatField(blank=True, null=True)),
                ("evapotranspiration_mm", models.FloatField(blank=True, null=True)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("ERA5", "ERA5"),
                            ("CMIP6_MRI", "CMIP6 MRI"),
                            ("CMIP6_NICAM", "CMIP6 NICAM"),
                        ],
                        default="ERA5",
                        max_length=16,
                    ),
                ),
                (
                    "region",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="daily",
                        to="regions.indonesiaregion",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ClimateMonthly",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("year", models.IntegerField()),
                ("month", models.IntegerField()),
                ("avg_temp_max", models.FloatField(blank=True, null=True)),
                ("avg_temp_min", models.FloatField(blank=True, null=True)),
                ("avg_temp_mean", models.FloatField(blank=True, null=True)),
                ("total_precipitation", models.FloatField(blank=True, null=True)),
                ("hot_days", models.IntegerField(default=0)),
                ("heavy_rain_days", models.IntegerField(default=0)),
                ("extreme_rain_days", models.IntegerField(default=0)),
                ("dry_days", models.IntegerField(default=0)),
                ("coverage", models.FloatField(default=0.0, help_text="Fraction of days with data")),
                (
                    "region",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="monthly",
                        to="regions.indonesiaregion",
                    ),
                ),
            ],
            options={"ordering": ["year", "month"]},
        ),
        migrations.CreateModel(
            name="ClimateAnnual",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("year", models.IntegerField()),
                ("avg_temp_max", models.FloatField(blank=True, null=True)),
                ("avg_temp_min", models.FloatField(blank=True, null=True)),
                ("total_precipitation", models.FloatField(blank=True, null=True)),
                ("rainy_days", models.IntegerField(default=0)),
                ("hot_days", models.IntegerField(default=0)),
                ("cool_days", models.IntegerField(default=0)),
                ("heavy_rain_days", models.IntegerField(default=0)),
                ("extreme_rain_days", models.IntegerField(default=0)),
                ("max_consecutive_dry_days", models.IntegerField(default=0)),
                ("wet_season_onset_doy", models.IntegerField(blank=True, null=True)),
                ("wet_season_end_doy", models.IntegerField(blank=True, null=True)),
                (
                    "region",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="annual",
                        to="regions.indonesiaregion",
                    ),
                ),
            ],
            options={"ordering": ["year"]},
        ),
        migrations.CreateModel(
            name="ENSOEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("year", models.IntegerField()),
                ("month", models.IntegerField()),
                ("oni_index", models.FloatField()),
                (
                    "phase",
                    models.CharField(
                        choices=[
                            ("EL_NINO", "El Niño"),
                            ("LA_NINA", "La Niña"),
                            ("NEUTRAL", "Neutral"),
                        ],
                        max_length=8,
                    ),
                ),
                (
                    "strength",
                    models.CharField(
                        choices=[
                            ("WEAK", "Weak"),
                            ("MODERATE", "Moderate"),
                            ("STRONG", "Strong"),
                            ("VERY_STRONG", "Very Strong"),
                            ("NONE", "None"),
                        ],
                        default="NONE",
                        max_length=12,
                    ),
                ),
            ],
            options={"ordering": ["year", "month"]},
        ),
        migrations.AddConstraint(
            model_name="climatedaily",
            constraint=models.UniqueConstraint(fields=["region", "date"], name="uniq_region_date"),
        ),
        migrations.AddIndex(
            model_name="climatedaily",
            index=models.Index(fields=["region", "date"], name="climate_region_date_idx"),
        ),
        migrations.AddConstraint(
            model_name="climatemonthly",
            constraint=models.UniqueConstraint(fields=["region", "year", "month"], name="uniq_monthly"),
        ),
        migrations.AddIndex(
            model_name="climatemonthly",
            index=models.Index(fields=["region", "year", "month"], name="climate_monthly_rym_idx"),
        ),
        migrations.AddConstraint(
            model_name="climateannual",
            constraint=models.UniqueConstraint(fields=["region", "year"], name="uniq_annual"),
        ),
        migrations.AddIndex(
            model_name="climateannual",
            index=models.Index(fields=["region", "year"], name="climate_annual_ry_idx"),
        ),
        migrations.AddConstraint(
            model_name="ensoevent",
            constraint=models.UniqueConstraint(fields=["year", "month"], name="uniq_enso_month"),
        ),
        # --- TimescaleDB hypertable on ClimateDaily.date ---
        migrations.RunPython(create_hypertable, migrations.RunPython.noop),
    ]
