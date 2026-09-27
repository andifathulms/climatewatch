import { routeMetadata } from "@/lib/metadata";
import { api } from "@/lib/api";
import { L, N } from "@/lib/i18n";
import WorkedExample from "@/components/fingerprint/WorkedExample";
import { buildColorScale } from "@/components/fingerprint/color-scale";
import Stripes from "@/components/ui/Stripes";

export const metadata = routeMetadata({
  title: "About the data",
  cardTitle: "How ClimateWatch knows what it knows",
  description:
    "Where the data comes from, every definition the site uses (hot days, feels-like heat, wet season onset, warming stripes, ENSO), how trends are fitted, and what changed when.",
  path: "/about",
});

type Bi = { en: string; id: string };

/**
 * Every rule a number on this site depends on, in both languages. The
 * wording avoids hard-coding counts that move with each data refresh.
 */
const DEFINITIONS: { term: Bi; body: Bi; color: string }[] = [
  {
    term: { en: "Warming stripes", id: "Garis pemanasan" },
    body: {
      en: "One band per year, coloured by how far that year's average daily high was from the city's own 1951–1980 average: blue cooler, orange hotter. The colour scale is fixed at ±2 °C for every city, so stripes from different cities can be compared directly. The current, incomplete year is left out.",
      id: "Satu pita per tahun, diwarnai menurut selisih rata-rata suhu tertinggi harian tahun itu dari rata-rata 1951–1980 kota itu sendiri: biru lebih sejuk, oranye lebih panas. Skala warnanya tetap ±2 °C untuk semua kota, jadi garis dari kota berbeda bisa dibandingkan langsung. Tahun berjalan yang belum lengkap tidak dihitung.",
    },
    color: "var(--heat-orange)",
  },
  {
    term: { en: "Feels-like temperature", id: "Suhu terasa" },
    body: {
      en: "The daily maximum of apparent temperature: air temperature adjusted for humidity and wind (Steadman's formula, as computed by Open-Meteo from the same reanalysis). In humid coastal cities it is often several degrees above the thermometer reading, and it is closer to the heat people actually live with.",
      id: "Nilai harian tertinggi dari suhu semu: suhu udara yang disesuaikan dengan kelembapan dan angin (rumus Steadman, dihitung Open-Meteo dari reanalisis yang sama). Di kota pesisir yang lembap angkanya sering beberapa derajat di atas termometer, dan lebih mendekati panas yang benar-benar dirasakan orang.",
    },
    color: "var(--heat-light)",
  },
  {
    term: { en: "Hot day (local)", id: "Hari panas (lokal)" },
    body: {
      en: "A day hotter than 95% of days in this city's 1951–1980 record. The threshold is computed per city and then held fixed: a baseline that drifted upward with the warming it measures would report no change at all. This is what the Hot days fingerprint shows.",
      id: "Hari yang lebih panas dari 95% hari dalam catatan 1951–1980 kota ini. Ambangnya dihitung per kota lalu dikunci: ambang yang ikut naik bersama pemanasan tidak akan pernah menunjukkan perubahan. Inilah yang ditampilkan sidik iklim Hari panas.",
    },
    color: "var(--heat-orange)",
  },
  {
    term: { en: "Hot spell / heatwave", id: "Gelombang panas" },
    body: {
      en: "The longest run of consecutive days above a threshold in one year. A day with no data breaks the run. City pages use the local threshold; the rankings keep the absolute 35 °C version so every city is measured against the same event, which is why many maritime cities read “never” there.",
      id: "Rentetan hari berturut-turut terpanjang di atas ambang dalam satu tahun. Hari tanpa data memutus rentetan. Halaman kota memakai ambang lokal; peringkat memakai ambang mutlak 35 °C agar semua kota diukur dengan kejadian yang sama, sehingga banyak kota maritim tertulis “tidak pernah”.",
    },
    color: "var(--heat-orange)",
  },
  {
    term: { en: "Heavy and extreme rain", id: "Hujan lebat dan ekstrem" },
    body: {
      en: "Daily rainfall above 50 mm (heavy), roughly where urban drainage starts to be overwhelmed, and above 100 mm (extreme), a common flood-risk proxy. Round numbers chosen for legibility, not from a local damage study.",
      id: "Curah hujan harian di atas 50 mm (lebat), kira-kira saat drainase kota mulai kewalahan, dan di atas 100 mm (ekstrem), penanda risiko banjir yang umum. Angka bulat demi keterbacaan, bukan hasil studi kerusakan lokal.",
    },
    color: "var(--rain-blue)",
  },
  {
    term: { en: "Dry day", id: "Hari kering" },
    body: {
      en: "Daily rainfall below 1 mm, effectively a day with no usable rain. 1 mm rather than 0 because trace amounts evaporate before they reach the ground or a crop.",
      id: "Curah hujan harian di bawah 1 mm, praktis hari tanpa hujan yang berguna. 1 mm, bukan 0, karena hujan sangat sedikit menguap sebelum mencapai tanah atau tanaman.",
    },
    color: "var(--drought-amber)",
  },
  {
    term: { en: "Wet season onset and end", id: "Awal dan akhir musim hujan" },
    body: {
      en: "Onset: the first 5 consecutive days after 1 August with at least 40 mm in total, a simplified BMKG-style rule. End: the last such spell before 1 August of the next year; this mirrors the onset rule rather than coming from BMKG, so it is the weaker of the two. Seasons missing either end are left out, never interpolated.",
      id: "Awal: 5 hari berturut-turut pertama setelah 1 Agustus dengan total minimal 40 mm, aturan sederhana ala BMKG. Akhir: rentang serupa terakhir sebelum 1 Agustus tahun berikutnya; aturan ini cerminan aturan awal, bukan dari BMKG, jadi lebih lemah. Musim yang salah satu ujungnya tidak terdeteksi tidak ditampilkan, tidak pernah diisi-isi.",
    },
    color: "var(--enso-nina)",
  },
  {
    term: { en: "Saturated onset", id: "Awal musim jenuh" },
    body: {
      en: "In cities where rain never really stops, the onset rule fires almost immediately after 1 August nearly every year. Where that happens in more than half of years, the date reflects where the search starts rather than a seasonal turn, so those cities show no onset trend at all.",
      id: "Di kota yang hujannya hampir tidak pernah berhenti, aturan awal musim terpicu hampir langsung setelah 1 Agustus hampir setiap tahun. Jika itu terjadi di lebih dari separuh tahun, tanggalnya mencerminkan titik mulai pencarian, bukan pergantian musim, jadi kota itu tidak ditampilkan tren awal musimnya.",
    },
    color: "var(--drought-amber)",
  },
];

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: Bi;
  title: Bi;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border py-12">
      <div className="grid gap-6 md:grid-cols-[11rem_1fr]">
        <p className="eyebrow md:pt-1.5">
          <L en={eyebrow.en} id={eyebrow.id} />
        </p>
        <div>
          <h2 className="font-display text-2xl font-semibold">
            <L en={title.en} id={title.id} />
          </h2>
          <div className="mt-4 space-y-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

const P = ({ en, id }: Bi) => (
  <p className="max-w-prose leading-relaxed text-text-secondary">
    <L en={en} id={id} />
  </p>
);

const TRACE_CITY = "jakarta";

export default async function AboutPage() {
  const region = await api.region(TRACE_CITY).catch(() => null);
  const [workedExample, fingerprint, stripes] = await Promise.all([
    region ? api.workedExample(region).catch(() => null) : null,
    region ? api.fingerprint(region, "precipitation").catch(() => null) : null,
    api.stripes().catch(() => null),
  ]);

  const tracedCell =
    workedExample && fingerprint
      ? fingerprint.data.find(
          (d) => d.year === workedExample.year && d.month === workedExample.month,
        )
      : null;
  const tracedColor =
    tracedCell?.value != null && fingerprint
      ? (buildColorScale("precipitation", fingerprint.stats)(tracedCell.value) as string)
      : null;

  return (
    <article>
      <header className="max-w-3xl pb-8 pt-12 sm:pt-16">
        <p className="eyebrow">
          <L en="About the data" id="Tentang data" />
        </p>
        <h1 className="mt-4 font-display text-hero font-semibold">
          <L en="How ClimateWatch knows what it knows" id="Dari mana ClimateWatch tahu yang ia tahu" />
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          <L
            en="Every number on this site traces back to one open dataset and a handful of explicit rules. Here they are, in plain words first."
            id="Setiap angka di situs ini berasal dari satu set data terbuka dan beberapa aturan yang jelas. Semuanya ada di sini, dengan bahasa sederhana lebih dulu."
          />
        </p>
      </header>

      <Section eyebrow={{ en: "Source", id: "Sumber" }} title={{ en: "Where the data comes from", id: "Asal data" }}>
        <p className="max-w-prose leading-relaxed text-text-secondary">
          <L
            en={<>All historical values come from <strong className="font-medium text-text-primary">ERA5 and ERA5-Land reanalysis</strong> (Copernicus / ECMWF) through the free </>}
            id={<>Semua nilai historis berasal dari <strong className="font-medium text-text-primary">reanalisis ERA5 dan ERA5-Land</strong> (Copernicus / ECMWF) melalui </>}
          />
          <a
            href="https://open-meteo.com/en/docs/historical-weather-api"
            rel="noopener noreferrer"
            target="_blank"
            className="text-rain-blue underline decoration-rain-blue/40 underline-offset-2 transition-colors hover:decoration-rain-blue"
          >
            Open-Meteo Historical Weather API
          </a>
          <L en=", from 1950 to the present." id=" yang gratis, dari 1950 sampai sekarang." />
        </p>
        <P
          en="A reanalysis is a weather model re-run over every past observation (stations, ships, balloons, satellites) to produce one gap-free record made the same way for 1950 as for today. That consistency is what makes a 77-year comparison meaningful. The catch: each value covers a grid square of roughly 10–30 km, not a single street, so very local effects like an urban heat island are smoothed away."
          id="Reanalisis adalah model cuaca yang dijalankan ulang atas semua pengamatan masa lalu (stasiun, kapal, balon, satelit) untuk menghasilkan satu catatan tanpa celah yang dibuat dengan cara yang sama untuk 1950 maupun hari ini. Konsistensi itulah yang membuat perbandingan 77 tahun bermakna. Kelemahannya: tiap nilai mewakili kotak grid sekitar 10–30 km, bukan satu jalan, jadi efek sangat lokal seperti pulau panas perkotaan ikut terhaluskan."
        />
      </Section>

      <Section eyebrow={{ en: "Consistency", id: "Konsistensi" }} title={{ en: "One model, 1950 to today", id: "Satu model, 1950 sampai sekarang" }}>
        <P
          en="Open-Meteo's archive, if you don't ask for a specific model, blends several: ERA5-Land and ERA5 up to 2016, then a higher-resolution forecast model from 2017. For climate trends that switch is a problem. In coastal cities it added up to 1.5 °C to daily highs in a single year: Jakarta jumped from 29.5 °C in 2016 to 31.1 °C in 2017 in the old data, which is a change of source, not of climate."
          id="Arsip Open-Meteo, jika tidak diminta model tertentu, mencampur beberapa model: ERA5-Land dan ERA5 sampai 2016, lalu model prakiraan beresolusi lebih tinggi sejak 2017. Untuk tren iklim, pergantian ini bermasalah. Di kota pesisir, suhu siang naik hingga 1,5 °C hanya dalam satu tahun: Jakarta melompat dari 29,5 °C pada 2016 ke 31,1 °C pada 2017 di data lama, dan itu perubahan sumber, bukan perubahan iklim."
        />
        <P
          en="Since September 2026 every request asks for ERA5-seamless explicitly (ERA5-Land where it exists, ERA5 elsewhere). It matches the earlier data value for value up to 2016 and stays on the same model family afterwards. Every city's record from 2017 onward was re-downloaded, and every number on the site was recomputed. Warming figures you may have seen here before September 2026 were larger than the data supports."
          id="Sejak September 2026 setiap permintaan meminta ERA5-seamless secara eksplisit (ERA5-Land jika tersedia, ERA5 untuk sisanya). Hasilnya sama persis dengan data lama sampai 2016 dan tetap pada keluarga model yang sama sesudahnya. Catatan setiap kota sejak 2017 diunduh ulang, dan semua angka di situs dihitung ulang. Angka pemanasan yang mungkin pernah kamu lihat di sini sebelum September 2026 lebih besar daripada yang didukung data."
        />
      </Section>

      {workedExample && region && (
        <Section eyebrow={{ en: "Trace", id: "Jejak" }} title={{ en: "One square, followed end to end", id: "Satu kotak, ditelusuri dari awal sampai akhir" }}>
          <p className="max-w-prose leading-relaxed text-text-secondary">
            <L
              en={<>A coordinate (<span className="font-numeric text-text-primary">{region.latitude.toFixed(3)}°, {region.longitude.toFixed(3)}°</span> for {region.name}) resolves to the nearest grid square. Open-Meteo returns one modelled value per day for that square; this site never reads anything finer and never claims to. Here is what happens to one month of it.</>}
              id={<>Satu koordinat (<span className="font-numeric text-text-primary">{region.latitude.toFixed(3)}°, {region.longitude.toFixed(3)}°</span> untuk {region.name}) mengarah ke kotak grid terdekat. Open-Meteo memberikan satu nilai model per hari untuk kotak itu; situs ini tidak pernah membaca yang lebih rinci dan tidak pernah mengklaimnya. Inilah yang terjadi pada satu bulan datanya.</>}
            />
          </p>
          <div className="card p-5 sm:p-6">
            <WorkedExample data={workedExample} />
          </div>
          {tracedCell?.value != null && tracedColor && (
            <div className="flex items-center gap-4 rounded-lg border border-border bg-surface-inset p-4">
              <span aria-hidden className="h-10 w-10 shrink-0 rounded" style={{ background: tracedColor }} />
              <p className="text-sm leading-relaxed text-text-secondary">
                <L en="That month's total, " id="Total bulan itu, " />
                <span className="font-numeric text-text-primary">
                  <N value={tracedCell.value} unit=" mm" />
                </span>
                <L
                  en={`, is one square in ${region.name}'s Rainfall fingerprint, in exactly this colour. Every square on every fingerprint is this same chain, repeated once per month, ${fingerprint?.data.length ?? "hundreds of"} times per city.`}
                  id={`, adalah satu kotak di sidik iklim Hujan ${region.name}, dengan warna persis ini. Setiap kotak di setiap sidik iklim melalui rantai yang sama, sekali per bulan, ${fingerprint?.data.length ?? "ratusan"} kali per kota.`}
                />
              </p>
            </div>
          )}
        </Section>
      )}

      <Section eyebrow={{ en: "Definitions", id: "Definisi" }} title={{ en: "How we define things", id: "Cara kami mendefinisikan" }}>
        {stripes && (
          <div className="mb-2">
            <Stripes anomalies={stripes.national.anomalies} className="h-8 w-full max-w-prose" label="National median warming stripes" />
            <p className="mt-1.5 max-w-prose text-2xs text-text-muted">
              <L
                en={`The typical Indonesian city, ${stripes.national.year_from}–${stripes.national.year_from + stripes.national.anomalies.length - 1}: the median of every city's stripes, year by year.`}
                id={`Kota Indonesia pada umumnya, ${stripes.national.year_from}–${stripes.national.year_from + stripes.national.anomalies.length - 1}: median garis semua kota, tahun demi tahun.`}
              />
            </p>
          </div>
        )}
        <dl>
          {DEFINITIONS.map((d, i) => (
            <div key={d.term.en} className={`flex gap-4 py-4 ${i > 0 ? "border-t border-border" : ""}`}>
              <span aria-hidden className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ background: d.color }} />
              <div>
                <dt className="font-semibold text-text-primary">
                  <L en={d.term.en} id={d.term.id} />
                </dt>
                <dd className="mt-1 max-w-prose text-sm leading-relaxed text-text-secondary">
                  <L en={d.body.en} id={d.body.id} />
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Section>

      <Section eyebrow={{ en: "Overlay", id: "Lapisan" }} title={{ en: "El Niño and La Niña", id: "El Niño dan La Niña" }}>
        <P
          en="El Niño and La Niña years come from the Oceanic Niño Index (ONI) of the NOAA Climate Prediction Center. El Niño tends to bring drier conditions to Indonesia, La Niña wetter. Turn on the El Niño / La Niña layer on any fingerprint to see the pattern against the rainfall grid."
          id="Tahun El Niño dan La Niña berasal dari Oceanic Niño Index (ONI) NOAA Climate Prediction Center. El Niño cenderung membawa kondisi lebih kering ke Indonesia, La Niña lebih basah. Nyalakan lapisan El Niño / La Niña di sidik iklim mana pun untuk melihat polanya pada grid hujan."
        />
      </Section>

      <Section eyebrow={{ en: "Ranking", id: "Peringkat" }} title={{ en: "How “biggest changes” are ranked", id: "Cara “perubahan terbesar” diurutkan" }}>
        <P
          en="Fit a straight line (ordinary least squares) to each yearly series, express the slope as change per decade, then divide by that series' own year-to-year standard deviation. That puts millimetres, degrees and days on one scale. It is a normalisation, not a weighting. A signal needs at least 30 years of data, the current incomplete year is excluded, and when nothing moves more than 0.15 standard deviations per decade the page says so instead of promoting the largest number in a flat field."
          id="Tarik garis lurus (kuadrat terkecil biasa) pada tiap seri tahunan, nyatakan kemiringannya sebagai perubahan per dekade, lalu bagi dengan simpangan baku tahunan seri itu sendiri. Dengan begitu milimeter, derajat dan hari berada di satu skala. Ini normalisasi, bukan pembobotan. Satu sinyal butuh minimal 30 tahun data, tahun berjalan tidak dihitung, dan jika tidak ada yang bergerak lebih dari 0,15 simpangan baku per dekade halaman akan mengatakannya, bukan menonjolkan angka terbesar di data yang datar."
        />
      </Section>

      <Section eyebrow={{ en: "Caveats", id: "Catatan" }} title={{ en: "What this is not", id: "Yang bukan" }}>
        <P
          en="Reanalysis is a model, not a thermometer on your street. It smooths local effects such as urban heat islands, narrow valleys and coastal microclimates. Read trends, not single squares. Where a city's coverage drops below 90%, its page says so."
          id="Reanalisis adalah model, bukan termometer di jalanmu. Ia menghaluskan efek lokal seperti pulau panas perkotaan, lembah sempit dan iklim mikro pesisir. Bacalah trennya, bukan satu kotak. Jika cakupan data suatu kota di bawah 90%, halamannya akan menyebutkannya."
        />
        <P
          en="Trends are straight lines across the whole record, which assumes a constant rate of change. It very likely hasn't been constant. Read them as “how much, overall”, not “when it started”."
          id="Tren adalah garis lurus sepanjang catatan, yang mengandaikan laju perubahan konstan. Kemungkinan besar tidak konstan. Bacalah sebagai “seberapa besar secara keseluruhan”, bukan “kapan mulainya”."
        />
      </Section>

      <Section eyebrow={{ en: "Citation", id: "Sitasi" }} title={{ en: "Cite the source", id: "Kutip sumbernya" }}>
        <p className="max-w-prose text-sm leading-relaxed text-text-muted">
          Hersbach, H., et al. (2020). The ERA5 global reanalysis.{" "}
          <em className="text-text-secondary">Quarterly Journal of the Royal Meteorological Society</em>, 146(730), 1999–2049.
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-text-muted">
          Muñoz-Sabater, J., et al. (2021). ERA5-Land: a state-of-the-art global reanalysis dataset for land applications.{" "}
          <em className="text-text-secondary">Earth System Science Data</em>, 13, 4349–4383.
        </p>
        <p className="max-w-prose text-sm leading-relaxed text-text-muted">
          Zippenfenig, P. (2023). Open-Meteo.com Weather API. Zenodo. CC BY 4.0.
        </p>
      </Section>
    </article>
  );
}
