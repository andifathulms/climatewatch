export type FingerprintVariable =
  "precipitation" | "temp_max" | "hot_days" | "hot_days_local" | "dry_days";

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
  has_data: boolean;
  /** 95th percentile of this city's 1951-1980 daily max, in °C. Null if the
   *  reference period is too incomplete to define one. */
  hot_day_threshold_c: number | null;
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
  hot_day_threshold_c: number | null;
}

export interface AnnualRow {
  year: number;
  hot_days: number;
  /** Days above this city's own 1951-1980 p95 threshold. */
  hot_days_local: number;
  cool_days: number;
  heavy_rain_days: number;
  extreme_rain_days: number;
  max_consecutive_dry_days: number;
  max_consecutive_hot_days: number;
  max_consecutive_hot_days_local: number;
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

export interface SeasonLength {
  year: number;
  length_days: number;
}

export interface SeasonResponse {
  region: Region;
  results: SeasonRow[];
  onset_trend: Trend;
  null_onset_years: number;
  lengths: SeasonLength[];
  length_trend: Trend;
  /** True when the onset rule fires almost immediately at its Aug 1 scan start
   *  in most years — the city has no detectable dry season, so onset and
   *  length are artifacts of the rule and must not be trended. */
  onset_saturated: boolean;
  onset_saturated_share: number;
}

export interface MoverSignal {
  field: string;
  label: string;
  unit: string;
  per_decade: number;
  z_per_decade: number;
  direction: string;
  first_year: number;
  last_year: number;
  n: number;
  early_mean: number;
  recent_mean: number;
}

export interface WorkedExampleDay {
  day: number;
  temp_max: number | null;
  precipitation_mm: number | null;
}

export interface WorkedExampleResponse {
  region: { id: number; name: string; slug: string };
  year: number;
  month: number;
  days: WorkedExampleDay[];
  /** The stored monthly row the fingerprint actually renders — read, never
   *  recomputed, so the example cannot agree with itself while disagreeing
   *  with the grid. */
  stored: {
    total_precipitation: number | null;
    avg_temp_max: number | null;
    hot_days_local: number;
    dry_days: number;
    heavy_rain_days: number;
  } | null;
  rules: {
    hot_day_threshold_c: number | null;
    dry_day_mm: number;
    heavy_rain_mm: number;
  };
}

export interface MoversResponse {
  region: Region;
  signals: MoverSignal[];
  /** Null when nothing cleared the minimum movement threshold. */
  leader: MoverSignal | null;
  rule: {
    method: string;
    min_years: number;
    min_abs_z: number;
    excludes_current_year: boolean;
  };
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
    avg_temp_max: number | null;
    avg_temp_min: number | null;
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

export interface ClimateRecord {
  region: { name: string; slug: string; province: string };
  year: number;
  month?: number; // present for monthly records, absent for yearly
  value: number;
}

export type RecordMetric = "hottest" | "coolest" | "wettest" | "driest";

export type RecordSet = Record<RecordMetric, ClimateRecord[]>;

export interface RecordsResponse {
  month: RecordSet;
  year: RecordSet;
}

export interface OverTimeSeries {
  region: { name: string; slug: string };
  values: (number | null)[];
  led: boolean; // did this city ever hold #1
}

export interface OverTimeMetric {
  label: string;
  unit: string;
  decimals: number;
  smoothing_years: number;
  years: number[];
  series: OverTimeSeries[];
  leader_by_year: (string | null)[];
}

export interface OverTimeResponse {
  temp: OverTimeMetric;
  rain: OverTimeMetric;
}
