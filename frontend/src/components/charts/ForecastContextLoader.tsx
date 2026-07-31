"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ForecastContextResponse, Region } from "@/lib/types";
import ForecastContext from "./ForecastContext";

/**
 * Forecast is always "as of right now", never a build-time snapshot — so
 * unlike the other panels (which are precomputed and fine to await
 * server-side), this one fetches client-side in both live and static mode.
 * In static mode there's no backend to proxy Open-Meteo through, so
 * api.forecastContext() calls it directly from the browser either way.
 */
export default function ForecastContextLoader({
  region,
}: {
  region: Pick<Region, "id" | "slug" | "latitude" | "longitude">;
}) {
  const [data, setData] = useState<ForecastContextResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .forecastContext(region)
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region.id, region.slug]);

  if (failed || !data) return null;
  return <ForecastContext data={data} />;
}
