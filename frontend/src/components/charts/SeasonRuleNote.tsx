import Link from "next/link";
import { L } from "@/lib/i18n";

/**
 * The wet-season rules, stated wherever a season number is shown.
 *
 * The end-of-season rule is weaker than the onset rule — onset is BMKG-derived,
 * the end is our own mirror of it — and length inherits the error of both.
 * Length is also the most quotable number on the page ("three weeks shorter per
 * decade"), so the definition travels with it rather than living only on the
 * methodology page.
 */
export default function SeasonRuleNote({
  saturatedShare,
  bordered = true,
}: {
  saturatedShare?: number;
  /** False when a caller already draws its own separator above this note
   *  (e.g. FingerprintPanel's Season layer sidebar) — avoids stacking two. */
  bordered?: boolean;
}) {
  return (
    <p
      className={`text-2xs leading-relaxed text-text-muted ${bordered ? "mt-4 border-t border-border pt-3" : ""}`}
    >
      <L
        en="Onset: the first 5-day spell totalling ≥40 mm after 1 August, the threshold BMKG uses: 40 mm over five days is roughly when soil holds enough water to plant, and five days is long enough that one storm cannot trigger a false start. End: the last such spell before 1 August of the next year. This is our own mirror of the onset rule, so it is the weaker of the two."
        id="Awal musim hujan: rentang 5 hari pertama dengan total ≥40 mm setelah 1 Agustus, ambang yang dipakai BMKG. 40 mm dalam lima hari kira-kira cukup untuk membasahi tanah sebelum tanam, dan lima hari cukup panjang agar satu badai tidak memicu awal palsu. Akhir: rentang serupa terakhir sebelum 1 Agustus tahun berikutnya. Aturan akhir ini buatan kami sendiri, jadi lebih lemah daripada aturan awal."
      />
      {saturatedShare !== undefined && (
        <>
          {" "}
          <L
            en={`Here the onset rule fires within 10 days of 1 August in ${Math.round(saturatedShare * 100)}% of years, so this city has no clear dry season to measure from.`}
            id={`Di sini aturan awal musim terpicu dalam 10 hari setelah 1 Agustus pada ${Math.round(saturatedShare * 100)}% tahun, jadi kota ini tidak punya musim kemarau yang jelas untuk diukur.`}
          />
        </>
      )}{" "}
      <Link
        href="/about"
        className="underline decoration-border-strong underline-offset-2 transition-colors hover:text-text-secondary"
      >
        <L en="Full definitions" id="Definisi lengkap" />
      </Link>
      .
    </p>
  );
}
