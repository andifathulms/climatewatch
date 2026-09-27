import Link from "next/link";
import { api } from "@/lib/api";
import { routeMetadata } from "@/lib/metadata";
import { L } from "@/lib/i18n";
import { buildStories } from "@/lib/stories";
import StoryCard from "@/components/home/StoryCard";
import Stripes from "@/components/ui/Stripes";

export const metadata = routeMetadata({
  title: "Stories",
  cardTitle: "Stories from Indonesia's climate record",
  description:
    "Short findings from 77 years of ERA5 data across Indonesian cities: who is warming fastest, record months, and every city's warming stripes.",
  path: "/stories",
});

/**
 * Findings for readers who arrive without a city in mind, then the whole
 * country as a wall of stripes: every city, north to south, one row each.
 * Everything here is computed from the export (lib/stories.ts), so it
 * re-writes itself whenever the data is refreshed.
 */
export default async function StoriesPage() {
  const [stripes, rankings, records, regions] = await Promise.all([
    api.stripes().catch(() => null),
    api.rankings().catch(() => null),
    api.records().catch(() => null),
    api.allRegions().catch(() => []),
  ]);
  const stories = buildStories({ stripes, rankings, records });
  const bySlug = new Map((stripes?.results ?? []).map((s) => [s.slug, s]));
  const lat = new Map(regions.map((r) => [r.slug, r.latitude]));
  const wall = [...(stripes?.results ?? [])].sort(
    (a, b) => (lat.get(b.slug) ?? 0) - (lat.get(a.slug) ?? 0),
  );
  const y0 = stripes?.national.year_from ?? 1950;
  const y1 = y0 + (stripes?.national.anomalies.length ?? 1) - 1;

  return (
    <div className="space-y-16">
      <header className="max-w-3xl pt-12 sm:pt-16">
        <p className="eyebrow">
          <L en="Stories" id="Cerita" />
        </p>
        <h1 className="mt-4 font-display text-hero font-semibold">
          <L en="What 77 years of data say" id="Apa kata data 77 tahun" />
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          <L
            en="Short findings from the same record every city page is built on. Each one links to the city behind it."
            id="Temuan singkat dari catatan yang sama dengan setiap halaman kota. Masing-masing tertaut ke kotanya."
          />
        </p>
      </header>

      {stories.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((st, i) => (
            <div key={st.key} className={i === 0 ? "md:col-span-2" : ""}>
              <StoryCard
                story={st}
                size={i === 0 ? "lg" : "md"}
                anomalies={st.slug ? bySlug.get(st.slug)?.anomalies ?? null : stripes?.national.anomalies ?? null}
              />
            </div>
          ))}
        </section>
      )}

      {wall.length > 0 && (
        <section>
          <div className="mb-6 max-w-3xl">
            <p className="eyebrow">
              <L en="Indonesia in stripes" id="Indonesia dalam garis" />
            </p>
            <h2 className="mt-2 font-display text-title font-semibold">
              <L
                en={`Every city, north to south, ${y0}–${y1}`}
                id={`Semua kota, dari utara ke selatan, ${y0}–${y1}`}
              />
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              <L
                en="One row per city, one stripe per year, each coloured by how that year's average daily high compared with the city's own 1951–1980 normal. Read down any column to see one year across the country; read across to see one city's story."
                id="Satu baris per kota, satu garis per tahun, diwarnai menurut selisih rata-rata suhu tertinggi harian tahun itu dari normal 1951–1980 kota tersebut. Baca satu kolom ke bawah untuk melihat satu tahun di seluruh negeri; baca ke samping untuk melihat kisah satu kota."
              />
            </p>
          </div>
          <div className="card p-3 sm:p-5">
            <ul className="space-y-[3px]">
              {wall.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/city/${s.slug}`}
                    className="group grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]"
                  >
                    <span className="truncate text-right text-2xs text-text-muted transition-colors group-hover:text-text-primary">
                      {s.name}
                    </span>
                    <Stripes
                      anomalies={s.anomalies}
                      rounded={false}
                      className="h-3 w-full transition-opacity group-hover:opacity-80"
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <div className="font-numeric mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 text-2xs text-text-muted sm:grid-cols-[9rem_minmax(0,1fr)]">
              <span />
              {/* Ticks placed at their true positions on the stripe axis. */}
              <span className="relative h-4">
                {[y0, 1980, 2000, y1].map((y, i, all) => (
                  <span
                    key={y}
                    className="absolute top-0"
                    style={{
                      left: `${((y - y0 + 0.5) / (y1 - y0 + 1)) * 100}%`,
                      transform:
                        i === 0 ? "none" : i === all.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
                    }}
                  >
                    {y}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
