/** Bilingual labels for the movers signals (backend MOVER_SIGNALS keys). */
export const SIGNAL_LABEL: Record<string, { en: string; id: string }> = {
  avg_temp_max: { en: "Average daily high", id: "Suhu tertinggi harian" },
  avg_apparent_temp_max: { en: "Feels-like daily high", id: "Suhu terasa tertinggi" },
  hot_days_local: { en: "Unusually hot days", id: "Hari luar biasa panas" },
  total_precipitation: { en: "Annual rainfall", id: "Curah hujan tahunan" },
  heavy_rain_days: { en: "Heavy rain days", id: "Hari hujan lebat" },
  max_consecutive_dry_days: { en: "Longest dry spell", id: "Kemarau terpanjang" },
  max_consecutive_hot_days_local: { en: "Longest hot spell", id: "Gelombang panas terpanjang" },
};

export function unitLabel(unit: string, lang: "en" | "id"): string {
  const u = unit.replace("/yr", "");
  if (lang === "en") return u;
  return u === "days" ? "hari" : u;
}
