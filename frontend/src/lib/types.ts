export type FingerprintVariable =
  | "precipitation"
  | "temp_max"
  | "hot_days"
  | "dry_days";

export interface Region {
  id: number;
  name: string;
  slug: string;
  type: string;
  latitude: number;
  longitude: number;
  province: string;
  bps_code: string;
  is_featured: boolean;
}

export interface RegionDetail extends Region {
  data_availability: {
    has_data: boolean;
    year_from: number | null;
    year_to: number | null;
    years_loaded: number;
  };
}

export interface ENSOEvent {
  year: number;
  month: number;
  oni_index: number;
  phase: "EL_NINO" | "LA_NINA" | "NEUTRAL";
  strength: string;
}

export interface FingerprintCell {
  year: number;
  month: number;
  value: number | null;
}

export interface FingerprintStats {
  min: number | null;
  max: number | null;
  p10: number | null;
  p90: number | null;
  mean: number | null;
}

export interface FingerprintResponse {
  region: { id: number; name: string; slug: string };
  variable: FingerprintVariable;
  year_from: number;
  year_to: number;
  data: FingerprintCell[];
  stats: FingerprintStats;
  enso_events: ENSOEvent[];
}

export interface AnnualRow {
  year: number;
  hot_days: number;
  cool_days: number;
  heavy_rain_days: number;
  extreme_rain_days: number;
  max_consecutive_dry_days: number;
  max_consecutive_hot_days: number;
}

export interface Trend {
  slope: number | null;
  intercept: number | null;
  n: number;
}

export interface ExtremesResponse {
  region: Region;
  results: AnnualRow[];
  trends: Record<string, Trend>;
  enso_events: ENSOEvent[];
}

export interface SeasonRow {
  year: number;
  wet_season_onset_doy: number | null;
  wet_season_end_doy: number | null;
}

export interface SeasonResponse {
  region: Region;
  results: SeasonRow[];
  onset_trend: Trend;
  null_onset_years: number;
}

export interface ForecastContextResponse {
  region: Region;
  forecast: {
    time?: string[];
    temperature_2m_max?: number[];
    precipitation_sum?: number[];
  };
  historical: {
    week_of_year: number;
    temp_max_p10: number | null;
    temp_max_p90: number | null;
    temp_max_mean: number | null;
    sample_days: number;
  };
}

export interface CompareProfile {
  region: Region;
  climatology: {
    month: number;
    avg_temp_mean: number | null;
    avg_precipitation: number | null;
  }[];
  annual: {
    year: number;
    avg_temp_max: number | null;
    total_precipitation: number | null;
    hot_days: number;
    extreme_rain_days: number;
  }[];
  warming_trend: Trend;
}

export interface CompareResponse {
  a: CompareProfile;
  b: CompareProfile;
}

export interface EnsoImpactPhase {
  months: number;
  avg_temp_mean: number | null;
  avg_precipitation: number | null;
}

export interface EnsoImpactDelta {
  temp_delta_c: number | null;
  precipitation_delta_pct: number | null;
}

export interface EnsoImpactResponse {
  region: Region;
  phases: {
    EL_NINO: EnsoImpactPhase;
    LA_NINA: EnsoImpactPhase;
    NEUTRAL: EnsoImpactPhase;
  };
  deltas: {
    EL_NINO: EnsoImpactDelta;
    LA_NINA: EnsoImpactDelta;
  };
}

export interface RankingEntry {
  region: { id: number; name: string; slug: string; province: string };
  years_loaded: number;
  avg_temp_max: number | null;
  avg_annual_precipitation: number | null;
  avg_extreme_rain_days_per_year: number | null;
  max_consecutive_hot_days: number | null;
  warming_c_per_decade: number | null;
}

export interface RankingsResponse {
  results: RankingEntry[];
}
