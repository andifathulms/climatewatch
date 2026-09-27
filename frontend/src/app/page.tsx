import Link from "next/link";
import { api } from "@/lib/api";
import { L, N } from "@/lib/i18n";
import { buildStories } from "@/lib/stories";
import FingerprintPreview from "@/components/fingerprint/FingerprintPreview";
import HomeExplorer from "@/components/home/HomeExplorer";
import StoryCard from "@/components/home/StoryCard";
import Stripes from "@/components/ui/Stripes";
import { decadeChange } from "@/components/city/stripe-stats";
import { getIndonesiaGeometry } from "@/lib/indonesia-geo";
import { SiteStructuredData } from "@/components/ui/StructuredData";

/** The city the hero speaks for until the reader picks another. */
const LEAD_CITY = "jakarta";

/** One per major island group, so the grid reads as the whole country. */
const POPULAR = [
  "jakarta",
  "surabaya",
  "bandung",
  "medan",
  "denpasar",
  "makassar",
  "balikpapan",
  "jayapura",
];

export default async function HomePage() {
  const [regions, stripes, rankings, records] = await Promise.all([
    api.allRegions().catch(() => []),
    api.stripes().catch(() => null),
    api.rankings().catch(() => null),
    api.records().catch(() => null),
  ]);
  const geometry = getIndonesiaGeometry();
  const series = stripes?.results ?? [];
  const bySlug = new Map(series.map((s) => [s.slug, s]));
  const lead = bySlug.has(LEAD_CITY) ? LEAD_CITY : series[0]?.slug;
  const leadRegion = regions.find((r) => r.slug === lead);
  const leadRain = leadRegion
    ? await api.fingerprint(leadRegion, "precipitation").catch(() => null)
    : null;

  const warming: Record<string, number | null> = {};
  for (const r of rankings?.results ?? []) warming[r.region.slug] = r.warming_c_per_decade;

  const stories = buildStories({ stripes, rankings, records });
  const popular = POPULAR.map((s) => bySlug.get(s)).filter(
    (s): s is NonNullable<typeof s> => Boolean(s),
  );
  const loadedCount = regions.filter((r) => r.has_data).length;

  return (
    <>
      <SiteStructuredData />

      {lead && series.length > 0 ? (
        <HomeExplorer
          initial={lead}
          stripes={series}
          warming={warming}
          regions={regions}
          geometry={geometry}
        />
      ) : (
        <section className="py-24 text-center">
          <h1 className="font-display text-display font-semibold">
            <L en="Is your city getting hotter?" id="Apakah kotamu makin panas?" />
          </h1>
          <p className="mx-auto mt-6 max-w-md text-text-secondary">
            <L
              en="The climate archive could not be reached. This is on our end. Please try again shortly."
              id="Arsip iklim tidak dapat dijangkau. Masalahnya ada di pihak kami. Silakan coba lagi sebentar lagi."
            />
          </p>
        </section>
      )}

      {/* ── Stories ─────────────────────────────────────────────────────── */}
      {stories.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                <L en="Stories from the data" id="Cerita dari data" />
              </p>
              <h2 className="mt-2 font-display text-title font-semibold">
                <L en="No city in mind? Start here." id="Belum punya kota? Mulai dari sini." />
              </h2>
            </div>
            <Link href="/stories" className="text-sm text-text-secondary underline decoration-border-strong underline-offset-4 hover:text-text-primary">
              <L en="All stories →" id="Semua cerita →" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {stories.slice(0, 3).map((st) => (
              <StoryCard
                key={st.key}
                story={st}
                anomalies={st.slug ? bySlug.get(st.slug)?.anomalies ?? null : stripes?.national.anomalies ?? null}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Popular cities ──────────────────────────────────────────────── */}
      {popular.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                <L en="Popular cities" id="Kota populer" />
              </p>
              <h2 className="mt-2 font-display text-title font-semibold">
                <L en="Every city has its own stripes" id="Setiap kota punya garisnya sendiri" />
              </h2>
            </div>
            <p className="text-sm text-text-muted">
              <L
                en={`${loadedCount} cities in total. Press ⌘K to search.`}
                id={`Total ${loadedCount} kota. Tekan ⌘K untuk mencari.`}
              />
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {popular.map((s) => {
              const c = decadeChange(s);
              return (
                <li key={s.slug}>
                  <Link
                    href={`/city/${s.slug}`}
                    className="group block h-full overflow-hidden rounded-lg border border-border bg-surface transition duration-200 ease-ease hover:-translate-y-0.5 hover:border-border-strong"
                  >
                    <Stripes anomalies={s.anomalies} rounded={false} className="h-14 w-full" />
                    <div className="flex items-end justify-between gap-2 p-4">
                      <div className="min-w-0">
                        <div className="truncate font-display text-xl font-semibold leading-tight text-text-primary">
                          {s.name}
                        </div>
                        <div className="mt-1 truncate text-2xs text-text-muted">{s.province}</div>
                      </div>
                      {c && (
                        <span className="num-display shrink-0 text-lg font-semibold text-heat-light">
                          <N value={c.delta} signed unit="°" />
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-2xs text-text-muted">
            <L
              en="Number = change in the average daily high between the first and last ten years of the record."
              id="Angka = perubahan rata-rata suhu tertinggi harian antara sepuluh tahun pertama dan terakhir."
            />
          </p>
        </section>
      )}

      {/* ── What a fingerprint is ───────────────────────────────────────── */}
      {leadRain && leadRegion && (
        <section className="mt-20 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:items-center">
          <div>
            <p className="eyebrow">
              <L en="The Climate Fingerprint" id="Sidik Iklim" />
            </p>
            <h2 className="mt-2 font-display text-title font-semibold">
              <L en="Every month since 1950, in one picture" id="Setiap bulan sejak 1950, dalam satu gambar" />
            </h2>
            <p className="mt-4 max-w-prose leading-relaxed text-text-secondary">
              <L
                en={`Each row is a year, each column a month, each square that month's rainfall in ${leadRegion.name}. Read down a column to see one month change over the decades. Every city page opens on its own fingerprint, with switches for temperature, feels-like heat, hot days and dry days.`}
                id={`Tiap baris satu tahun, tiap kolom satu bulan, tiap kotak curah hujan bulan itu di ${leadRegion.name}. Baca satu kolom ke bawah untuk melihat satu bulan berubah dari dekade ke dekade. Setiap halaman kota dibuka dengan sidik iklimnya sendiri, lengkap dengan pilihan suhu, suhu terasa, hari panas dan hari kering.`}
              />
            </p>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-text-muted">
              <L
                en="The data is ERA5 reanalysis: a weather model re-run over every past observation to give one consistent record from 1950 to today. Each value covers a grid square of about 10–30 km, not a single street."
                id="Datanya adalah reanalisis ERA5: model cuaca yang dijalankan ulang atas semua pengamatan masa lalu untuk menghasilkan satu catatan yang konsisten dari 1950 sampai sekarang. Tiap nilai mewakili kotak grid sekitar 10–30 km, bukan satu jalan."
              />{" "}
              <Link href="/about" className="text-text-secondary underline decoration-border-strong underline-offset-2 hover:text-text-primary">
                <L en="About the data →" id="Tentang data →" />
              </Link>
            </p>
          </div>
          <Link href={`/city/${leadRegion.slug}`} className="block" aria-label={`${leadRegion.name}`}>
            <FingerprintPreview fingerprint={leadRain} years={80} />
          </Link>
        </section>
      )}
    </>
  );
}
