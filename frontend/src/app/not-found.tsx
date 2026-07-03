import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-4xl font-bold">Not found</h1>
      <p className="mt-3 text-text-secondary">
        That city or page doesn&apos;t exist yet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-text-primary px-4 py-2 text-sm text-white"
      >
        Back to home
      </Link>
    </div>
  );
}
