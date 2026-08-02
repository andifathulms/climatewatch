"use client";

import Link from "next/link";
import { useState } from "react";
import type { MonthRecord, RecordsResponse } from "@/lib/types";
import { MONTHS } from "@/lib/format";

type Key = keyof RecordsResponse;

const TABS: {
  key: Key;
  label: string;
  eyebrow: string;
  color: string;
  format: (v: number) => string;
  note: string;
}[] = [
  {
    key: "hottest",
    label: "Hottest month",
    eyebrow: "Highest monthly average daily high",
    color: "var(--heat-orange)",
    format: (v) => `${v.toFixed(1)}°C`,
    note: "A monthly average of the daily high — a hot month, not a single scorching day.",
  },
  {
    key: "coolest",
    label: "Coolest month",
    eyebrow: "Lowest monthly average daily high",
    color: "var(--rain-blue)",
    format: (v) => `${v.toFixed(1)}°C`,
    note: "A monthly average of the daily high — highland cities dominate.",
  },
  {
    key: "wettest",
    label: "Wettest month",
    eyebrow: "Most rain in a single calendar month",
    color: "var(--rain-blue)",
    format: (v) => `${v.toFixed(0)} mm`,
    note: "Total rainfall within one calendar month.",
  },
  {
    key: "driest",
    label: "Driest month",
    eyebrow: "Least rain in a single calendar month",
    color: "var(--drought-amber)",
    format: (v) => `${v.toFixed(0)} mm`,
    note: "Total rainfall within one calendar month — dry-season months near 0mm tie often.",
  },
];

export default function RecordsBoard({ data }: { data: RecordsResponse }) {
  const [tab, setTab] = useState<Key>("hottest");
  const active = TABS.find((t) => t.key === tab)!;
  const rows: MonthRecord[] = data[tab] ?? [];

  return (
    <section className="card p-6">
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              t.key === tab
                ? "bg-surface-muted text-text-primary ring-1 ring-border-strong"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="eyebrow">{active.eyebrow}</p>
      <p className="mt-1 text-xs text-text-muted">
        The 15 most extreme single months across all cities, 1950–present.
      </p>

      <ol className="mt-5 space-y-0.5">
        {rows.map((r, i) => (
          <li key={`${r.region.slug}-${r.year}-${r.month}`}>
            <Link
              href={`/city/${r.region.slug}`}
              className="group flex items-center gap-4 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-muted"
            >
              <span className="font-numeric w-5 shrink-0 text-right text-xs text-text-muted">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-text-primary">
                    {r.region.name}
                    <span className="ml-2 font-normal text-text-muted">
                      {MONTHS[r.month - 1]} {r.year}
                    </span>
                  </span>
                  <span
                    className="font-numeric shrink-0 text-sm font-semibold"
                    style={{ color: active.color }}
                  >
                    {active.format(r.value)}
                  </span>
                </div>
                <div className="truncate text-xs text-text-muted">
                  {r.region.province}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-6 border-t border-border pt-4 text-xs leading-relaxed text-text-muted">
        {active.note}
      </p>
    </section>
  );
}
