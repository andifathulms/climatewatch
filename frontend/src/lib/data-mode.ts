/**
 * Two ways this app can get its data:
 *  - "live"   (default): fetch the Django REST API at NEXT_PUBLIC_API_URL.
 *  - "static": read the JSON files exported by `manage.py export_static`,
 *              baked into `public/data/` ahead of time (GitHub Pages build).
 *
 * Every api.ts function branches on MODE internally, so callers never see
 * the difference — switching modes is this one env var, not a code change.
 */
export const DATA_MODE: "live" | "static" =
  process.env.NEXT_PUBLIC_DATA_MODE === "static" ? "static" : "live";

// Only meaningful in static mode, and only when the export lives at a
// sub-path (e.g. a GitHub Pages project site at /climatewatch/). Must match
// next.config.js's `basePath` — both read this same env var so there is one
// source of truth.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Read one exported JSON file. On the server (build time, Node runtime) this
 * reads straight off disk — faster, and avoids needing a server to be running
 * during `next build`. In the browser (client components) it fetches the
 * same file as a static asset.
 */
export async function getStatic<T>(relPath: string): Promise<T> {
  if (typeof window === "undefined") {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    const full = join(process.cwd(), "public", "data", relPath);
    const raw = await readFile(full, "utf-8");
    return JSON.parse(raw) as T;
  }
  const res = await fetch(`${BASE_PATH}/data/${relPath}`);
  if (!res.ok) {
    throw new Error(`Static data ${res.status} for ${relPath}`);
  }
  return res.json() as Promise<T>;
}

export { BASE_PATH };
