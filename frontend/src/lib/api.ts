import type {
  CompareResponse,
  EnsoImpactResponse,
  ExtremesResponse,
  FingerprintResponse,
  FingerprintVariable,
  ForecastContextResponse,
  RankingsResponse,
  Region,
  RegionDetail,
  SeasonResponse,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

export const api = {
  regions(): Promise<{ results: Region[] }> {
    return get("/regions/");
  },
  /** All regions across every page — /regions/ is paginated at 50/page. */
  async allRegions(): Promise<Region[]> {
    const all: Region[] = [];
    let path: string | null = "/regions/";
    while (path) {
      const page: { results: Region[]; next: string | null } = await get(path);
      all.push(...page.results);
      path = page.next ? page.next.slice(page.next.indexOf("/api") + 4) : null;
    }
    return all;
  },
  region(id: number | string): Promise<RegionDetail> {
    return get(`/regions/${id}/`);
  },
  searchRegions(q: string): Promise<Region[]> {
    return get(`/regions/search/?q=${encodeURIComponent(q)}`);
  },
  fingerprint(
    regionId: number,
    variable: FingerprintVariable = "precipitation",
    yearFrom?: number,
    yearTo?: number,
  ): Promise<FingerprintResponse> {
    const params = new URLSearchParams({ variable });
    if (yearFrom) params.set("year_from", String(yearFrom));
    if (yearTo) params.set("year_to", String(yearTo));
    return get(`/climate/${regionId}/fingerprint/?${params}`);
  },
  extremes(regionId: number): Promise<ExtremesResponse> {
    return get(`/climate/${regionId}/extremes/`);
  },
  season(regionId: number): Promise<SeasonResponse> {
    return get(`/climate/${regionId}/season/`);
  },
  forecastContext(regionId: number): Promise<ForecastContextResponse> {
    return get(`/climate/${regionId}/forecast-context/`, {
      // Forecast is live — don't cache for an hour.
      next: { revalidate: 900 },
    });
  },
  compare(a: number, b: number): Promise<CompareResponse> {
    return get(`/compare/?a=${a}&b=${b}`);
  },
  ensoImpact(regionId: number): Promise<EnsoImpactResponse> {
    return get(`/climate/${regionId}/enso-impact/`);
  },
  rankings(): Promise<RankingsResponse> {
    return get("/climate/rankings/");
  },
};

export { API_URL };
