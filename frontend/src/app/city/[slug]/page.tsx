import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { api } from "@/lib/api";
import FingerprintPanel from "@/components/fingerprint/FingerprintPanel";
import ExtremeDaysChart from "@/components/charts/ExtremeDaysChart";
import SeasonShiftScatter from "@/components/charts/SeasonShiftScatter";
import ForecastContext from "@/components/charts/ForecastContext";
import DataAttribution from "@/components/ui/DataAttribution";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const region = await api.region(params.slug);
    return {
      title: `${region.name} climate`,
      description: `75 years of climate data for ${region.name}, ${region.province} — rainfall, temperature, extreme days and season shift.`,
    };
  } catch {
    return { title: "City" };
  }
}

export default async function CityPage({ params }: { params: { slug: string } }) {
  const region = await api.region(params.slug).catch(() => null);
  if (!region) notFound();

  if (!region.data_availability.has_data) {
    return (
      <div className="py-16 text-center">
        <h1 className="font-serif text-3xl font-bold">{region.name}</h1>
        <p className="mt-3 text-text-secondary">
          Climate data for {region.name} is not loaded yet. Run{" "}
          <code className="font-numeric">
            manage.py climate_bootstrap --slug {region.slug}
          </code>{" "}
          on the backend.
        </p>
        <DataAttribution />
      </div>
    );
  }

  const [fingerprint, extremes, season, forecast] = await Promise.all([
    api.fingerprint(region.id, "precipitation"),
    api.extremes(region.id).catch(() => null),
    api.season(region.id).catch(() => null),
    api.forecastContext(region.id).catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-3xl font-bold">📍 {region.name}</h1>
          <p className="text-text-secondary">{region.province}</p>
        </div>
        <p className="text-sm text-text-muted">
          {region.data_availability.year_from}–{region.data_availability.year_to} ·{" "}
          {region.data_availability.years_loaded} years of data
        </p>
      </header>

      {forecast && <ForecastContext data={forecast} />}

      <FingerprintPanel regionId={region.id} initial={fingerprint} />

      <div className="grid gap-6 md:grid-cols-2">
        {extremes && <ExtremeDaysChart data={extremes} />}
        {season && <SeasonShiftScatter data={season} />}
      </div>

      <DataAttribution />
    </div>
  );
}
