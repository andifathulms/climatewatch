"use client";

/**
 * Choose one of N. Native radios, no ARIA.
 *
 * Three of these were previously `role="tablist"` + `role="tab"` +
 * `aria-selected` on plain buttons, with none of what that contract promises:
 * no arrow-key navigation, no roving tabindex, no aria-controls, no
 * tabpanel. A screen reader announced "tab, 1 of 4", the user pressed the
 * arrow key the pattern requires, and nothing happened. Two more were bare
 * buttons that never announced which one was active at all.
 *
 * A radio group is what this control actually is, and using real inputs means
 * the browser supplies arrow-key roving, the group name, the selected state
 * and the "3 of 5" position for free — so the fix removes ARIA rather than
 * adding it. The input is sr-only (clipped, still focusable) and the visible
 * pill is its <span>, styled off `peer-checked` / `peer-focus-visible`.
 */
export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export default function SegmentedControl<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  variant = "solid",
}: {
  /** Radio group name — must be unique per rendered group on the page. */
  name: string;
  /** Group label. Visually hidden: the surrounding chart header already says
   *  what this picks, so showing it again would be duplicate chrome — but a
   *  radio group with no legend is unnamed to a screen reader. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  /** "solid" = pill track (chart headers). "ghost" = free-floating chips. */
  variant?: "solid" | "ghost";
}) {
  const track =
    variant === "solid"
      ? "inline-flex rounded-full border border-border bg-surface-inset p-1"
      : "flex flex-wrap gap-2";

  const checked =
    variant === "solid"
      ? "peer-checked:bg-text-primary peer-checked:text-canvas peer-checked:shadow-sm"
      : "peer-checked:bg-surface-muted peer-checked:text-text-primary peer-checked:ring-1 peer-checked:ring-border-strong";

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">{label}</legend>
      <div className={track}>
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium text-text-secondary transition-all duration-150 hover:text-text-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-rain-blue ${checked}`}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
