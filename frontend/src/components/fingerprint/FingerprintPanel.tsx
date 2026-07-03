"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { FingerprintResponse, FingerprintVariable } from "@/lib/types";
import ClimateFingerprint from "./ClimateFingerprint";

const VARIABLES: { key: FingerprintVariable; label: string }[] = [
  { key: "precipitation", label: "Rainfall" },
  { key: "temp_max", label: "Temperature" },
  { key: "hot_days", label: "Hot Days" },
  { key: "dry_days", label: "Dry Days" },
];

export default function FingerprintPanel({
  regionId,
  initial,
}: {
  regionId: number;
  initial: FingerprintResponse;
}) {
  const [variable, setVariable] = useState<FingerprintVariable>("precipitation");
  const [data, setData] = useState<FingerprintResponse>(initial);
  const [showEnso, setShowEnso] = useState(false);
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (variable === initial.variable && data.variable === variable) return;
    let cancelled = false;
    setLoading(true);
    api
      .fingerprint(regionId, variable)
      .then((d) => !cancelled && setData(d))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variable, regionId]);

  const annualTotal =
    hoverYear !== null
      ? data.data
          .filter((d) => d.year === hoverYear && d.value !== null)
          .reduce((s, d) => s + (d.value ?? 0), 0)
      : null;

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Climate Fingerprint</h2>
          <p className="text-sm text-text-secondary">
            {data.year_from}–{data.year_to} · monthly {data.variable.replace("_", " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {VARIABLES.map((v) => (
            <button
              key={v.key}
              onClick={() => setVariable(v.key)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                variable === v.key
                  ? "bg-text-primary text-white"
                  : "bg-surface-muted text-text-secondary hover:bg-border"
              }`}
            >
              {v.label}
            </button>
          ))}
          <label className="ml-2 flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showEnso}
              onChange={(e) => setShowEnso(e.target.checked)}
            />
            ENSO overlay
          </label>
        </div>
      </div>

      <div className="flex gap-6">
        <div className={loading ? "opacity-50 transition" : "transition"}>
          <ClimateFingerprint
            data={data}
            showEnso={showEnso}
            onHoverYear={setHoverYear}
          />
        </div>

        <aside className="hidden min-w-40 flex-1 md:block">
          {hoverYear !== null ? (
            <div className="rounded-lg bg-surface-muted p-4">
              <div className="font-numeric text-3xl font-semibold">{hoverYear}</div>
              <div className="mt-2 text-sm text-text-secondary">Annual total</div>
              <div className="font-numeric text-lg">
                {annualTotal !== null ? annualTotal.toFixed(1) : "—"}
              </div>
            </div>
          ) : (
            <div className="text-sm text-text-muted">
              Hover a cell for month detail, or a row for the annual total.
            </div>
          )}

          {showEnso && (
            <div className="mt-4 space-y-1 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-1.5" style={{ background: "var(--enso-nino)" }} />
                El Niño (tends drier in Indonesia)
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-1.5" style={{ background: "var(--enso-nina)" }} />
                La Niña (tends wetter)
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
