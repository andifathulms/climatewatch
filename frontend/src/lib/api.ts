import type {
  CompareProfile,
  CompareResponse,
  EnsoImpactResponse,
  ExtremesResponse,
  FingerprintResponse,
  FingerprintVariable,
  ForecastContextResponse,
  MoversResponse,
  OverTimeResponse,
  RankingsResponse,
  RecordsResponse,
  Region,
  RegionDetail,
  SeasonResponse,
  WorkedExampleResponse,
} from "./types";
import { DATA_MODE, getStatic } from "./data-mode";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The fields every static-mode lookup needs — every call site already has these. */
type RegionRef = Pick<Region, "id" | "slug">;
type RegionGeo = Pick<Region, "id" | "slug" | "latitude" | "longitude">;

interface DoyClimatologyEntry {
  doy: number;
  temp_max_p10: number | null;
  temp_max_p90: number | null;
  temp_max_mean: number | null;
  sample_days: number;
}

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    // Revalidate hourly — climate data changes at most daily.
    next: { revalidate: 3600 },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getFullYear(), 0, 1);
  const diff = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start;
  return Math.floor(diff / 86_400_000) + 1;
}

/**
 * Live 7-day forecast, fetched straight from Open-Meteo's public API — no
 * key, CORS-friendly, works identically whether called from the server
 * (live mode) or the browser (static mode, where there's no backend to proxy
 * it through).
 */
async function fetchOpenMeteoForecast(region: RegionGeo) {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?${new URLSearchParams({
      latitude: String(region.latitude),
      longitude: String(region.longitude),
      daily: "temperature_2m_max,precipitation_sum",
      timezone: "Asia/Jakarta",
      forecast_days: "7",
    })}`,
  );
  if (!res.ok) throw new Error(`Open-Meteo forecast ${res.status}`);
  const body = await res.json();
  return body.daily ?? {};
}

export const api = {
  regions(): Promise<{ results: Region[] }> {
    if (DATA_MODE === "static") {
      return getStatic<Region[]>("regions.json").then((results) => ({ results }));
    }
    return get("/regions/");
  },
  /** All regions across every page — /regions/ is paginated at 50/page in live mode. */
  async allRegions(): Promise<Region[]> {
    if (DATA_MODE === "static") {
      return getStatic<Region[]>("regions.json");
    }
    const all: Region[] = [];
    let path: string | null = "/regions/";
    while (path) {
      const page: { results: Region[]; next: string | null } = await get(path);
      all.push(...page.results);
      path = page.next ? page.next.slice(page.next.indexOf("/api") + 4) : null;
    }
    return all;
  },
  region(slugOrId: number | string): Promise<RegionDetail> {
    if (DATA_MODE === "static") {
      return getStatic(`region/${slugOrId}.json`);
    }
    return get(`/regions/${slugOrId}/`);
  },
  async searchRegions(q: string): Promise<Region[]> {
    if (DATA_MODE === "static") {
      const query = q.trim().toLowerCase();
      const all = await getStatic<Region[]>("regions.json");
      return all
        .filter(
          (r) =>
            r.name.toLowerCase().includes(query) ||
            r.province.toLowerCase().includes(query),
        )
        .slice(0, 50);
    }
    return get(`/regions/search/?q=${encodeURIComponent(q)}`);
  },
  fingerprint(
    region: RegionRef,
    variable: FingerprintVariable = "precipitation",
    yearFrom?: number,
    yearTo?: number,
  ): Promise<FingerprintResponse> {
    if (DATA_MODE === "static") {
      // Static export always bakes the full 1950–present range — nothing in
      // the UI currently requests a sub-range, so year_from/year_to trimming
      // isn't exposed as a build-time param.
      return getStatic(`fingerprint/${region.slug}/${variable}.json`);
    }
    const params = new URLSearchParams({ variable });
    if (yearFrom) params.set("year_from", String(yearFrom));
    if (yearTo) params.set("year_to", String(yearTo));
    return get(`/climate/${region.id}/fingerprint/?${params}`);
  },
  extremes(region: RegionRef): Promise<ExtremesResponse> {
    if (DATA_MODE === "static") {
      return getStatic(`extremes/${region.slug}.json`);
    }
    return get(`/climate/${region.id}/extremes/`);
  },
  season(region: RegionRef): Promise<SeasonResponse> {
    if (DATA_MODE === "static") {
      return getStatic(`season/${region.slug}.json`);
    }
    return get(`/climate/${region.id}/season/`);
  },
  workedExample(region: RegionRef): Promise<WorkedExampleResponse> {
    if (DATA_MODE === "static") {
      return getStatic(`worked-example/${region.slug}.json`);
    }
    return get(`/climate/${region.id}/worked-example/`);
  },
  movers(region: RegionRef): Promise<MoversResponse> {
    if (DATA_MODE === "static") {
      return getStatic(`movers/${region.slug}.json`);
    }
    return get(`/climate/${region.id}/movers/`);
  },
  async forecastContext(
    region: RegionGeo & Partial<Region>,
  ): Promise<ForecastContextResponse> {
    if (DATA_MODE === "static") {
      const [forecast, climatology] = await Promise.all([
        fetchOpenMeteoForecast(region),
        getStatic<DoyClimatologyEntry[]>(`doy-climatology/${region.slug}.json`),
      ]);
      const doy = dayOfYear(new Date());
      const entry = climatology.find((c) => c.doy === doy) ?? {
        doy,
        temp_max_p10: null,
        temp_max_p90: null,
        temp_max_mean: null,
        sample_days: 0,
      };
      return {
        region: region as Region,
        forecast,
        historical: {
          week_of_year: doy,
          temp_max_p10: entry.temp_max_p10,
          temp_max_p90: entry.temp_max_p90,
          temp_max_mean: entry.temp_max_mean,
          sample_days: entry.sample_days,
        },
      };
    }
    return get(`/climate/${region.id}/forecast-context/`, {
      // Forecast is live — don't cache for an hour.
      next: { revalidate: 900 },
    });
  },
  async compare(regionA: RegionRef, regionB: RegionRef): Promise<CompareResponse> {
    if (DATA_MODE === "static") {
      const [a, b] = await Promise.all([
        getStatic<CompareProfile>(`compare-profile/${regionA.slug}.json`),
        getStatic<CompareProfile>(`compare-profile/${regionB.slug}.json`),
      ]);
      return { a, b };
    }
    return get(`/compare/?a=${regionA.id}&b=${regionB.id}`);
  },
  ensoImpact(region: RegionRef): Promise<EnsoImpactResponse> {
    if (DATA_MODE === "static") {
      return getStatic(`enso-impact/${region.slug}.json`);
    }
    return get(`/climate/${region.id}/enso-impact/`);
  },
  rankings(): Promise<RankingsResponse> {
    if (DATA_MODE === "static") {
      return getStatic("rankings.json");
    }
    return get("/climate/rankings/");
  },
  records(): Promise<RecordsResponse> {
    if (DATA_MODE === "static") {
      return getStatic("monthly-records.json");
    }
    return get("/climate/records/");
  },
  overTime(): Promise<OverTimeResponse> {
    if (DATA_MODE === "static") {
      return getStatic("leaders-over-time.json");
    }
    return get("/climate/over-time/");
  },
};

export { API_URL, DATA_MODE };
