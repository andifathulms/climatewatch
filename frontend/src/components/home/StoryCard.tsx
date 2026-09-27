import Link from "next/link";
import type { Story } from "@/lib/stories";
import { L } from "@/lib/i18n";
import Stripes from "@/components/ui/Stripes";

export default function StoryCard({
  story,
  anomalies,
  size = "md",
}: {
  story: Story;
  anomalies: (number | null)[] | null;
  size?: "md" | "lg";
}) {
  return (
    <Link
      href={story.href}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface transition duration-200 ease-ease hover:-translate-y-0.5 hover:border-border-strong"
    >
      {anomalies && (
        <Stripes
          anomalies={anomalies}
          rounded={false}
          className={size === "lg" ? "h-24 w-full" : "h-12 w-full"}
        />
      )}
      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="eyebrow">
          <L en={story.kicker.en} id={story.kicker.id} />
        </p>
        <h3 className={`font-display font-semibold leading-tight text-text-primary ${size === "lg" ? "text-2xl" : "text-xl"}`}>
          <L en={story.title.en} id={story.title.id} />
        </h3>
        <p className="text-sm leading-relaxed text-text-secondary">
          <L en={story.body.en} id={story.body.id} />
        </p>
        <span aria-hidden className="mt-auto pt-2 text-sm text-text-muted transition-colors group-hover:text-text-primary">
          →
        </span>
      </div>
    </Link>
  );
}
