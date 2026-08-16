# DESIGN.md — ClimateWatch

Design specification for the structural rework. Read in full before changing
any file. `PRD.md` governs *what* is computed and ingested; `CLAUDE.md`
governs engine, data, and API rules. This file governs *what the user sees*
and *how the evidence is arranged*.

Precedence: `CLAUDE.md`'s data-integrity rules (§"Key Decisions (Do Not
Change)", null handling, precomputed aggregates, attribution) always outrank
this file. Where this file contradicts a *presentational* line in `CLAUDE.md`,
this file wins, and §11 lists the `CLAUDE.md` lines to amend so the two docs
stop disagreeing.

---

## 0. The thesis

**The craft here is already good. The argument is missing.**

This is not a repaint. The token system is centralised, every ink colour
carries a measured WCAG ratio in a comment, the fingerprint ships an `sr-only`
`<table>` as a real text alternative, focus-visible states are hand-drawn, and
`prefers-reduced-motion` is honoured globally. Do not undo any of that. The
"Musim Nokturnal" warm near-black canvas is a better call than the light cream
palette in `PRD.md` and stays.

Two things are wrong, and both are structural:

**1. The core object is physically unviewable.** The fingerprint runs to
~1,900px tall and scrolls inside its own container. The product's entire claim
is "see how 75 years changed" — and roughly fifteen years are visible at once.
By the time you scroll to 2020 you cannot see 1950. Cross-decade comparison,
which is the whole point, is destroyed by the layout.

**2. The app never answers its own question.** The homepage asks "Is your city
actually getting hotter?" and the city page responds with eight stacked
modules — `WhatMovedMost`, `WorkedExample`, `FingerprintPanel`,
`PersonalBaseline`, `ExtremeDaysChart`, `SeasonShiftScatter`,
`SeasonLengthChart`, `ENSOImpactCard`. Each is competent. Together they are a
report nobody finishes, and nowhere is there a sentence saying *yes, by 1.1°C,
and your wet season starts eleven days later than it did in 1980.*

**The fix for both is one move: make the whole record fit on one screen, and
let the fingerprint absorb the other charts as layers.**

`SeasonShiftScatter` is not a chart. It is a line on the fingerprint. ENSO is
not a card. It is a marking in the year gutter. Extreme days are not a Recharts
line. They are outlined cells. They are all the same data on the same two axes,
currently scattered across five components in a vertical stack where the reader
has to re-register each one against a grid they have already scrolled past.

---

## 1. Decisions already made — do not relitigate

1. The product is named **ClimateWatch**. Align `PRD.md` and `CLAUDE.md`'s
   "Iklim" to match. "Musim Nokturnal" stays — it names the palette, not the
   product.
2. The fingerprint fits the viewport at default zoom. Row height becomes
   adaptive; the fixed 22px in `CLAUDE.md` is superseded (§11).
3. `ExtremeDaysChart`, `SeasonShiftScatter`, `SeasonLengthChart` and
   `ENSOImpactCard` are absorbed into the fingerprint as layers (§5).
4. **One theme, deliberately.** Do not add a light mode or a toggle. See §2.5.
5. The palette, the type stack, and the five sequential ramps are **frozen**.
   The only new colour work in this document is the diverging anomaly ramp
   (§3.2), and it is genuinely new, not a variation on an existing ramp.
6. Interface language stays English for now, consistent with the shipped build.
   Revisit alongside Falak, not separately.

---

## 2. House layer — portable across the portfolio

Thin, colour-free, typeface-free. Copied between projects. **This is version 2**
— §2.5 corrects an overreach in the version written for Falak.

### 2.1 Core-object dominance

Every app has one core object. It is the largest element on screen, the first
thing rendered, and **legible in full at default state.** An object that only
fits by scrolling inside its own container is not dominant; it is imprisoned.
This is ClimateWatch's central failure and belongs in the house rules so it
does not recur elsewhere.

### 2.2 Spacing rhythm

A 4px-based scale defined once as custom properties and mirrored into Tailwind.
ClimateWatch already has this (`--space-1`…`--space-24`, plus `section` and
`gutter` aliases). Keep exactly.

### 2.3 Type scale

One scale, with Tailwind's own fully overridden rather than extended, so
nothing can resolve outside it. ClimateWatch already does this correctly,
including the documented `--svg-tick-size` escape hatch for SVG presentation
attributes that cannot consume `var()`. Keep exactly.

### 2.4 Motion timing

One easing token, transitions in the 150–300ms band for state, a single
orchestrated entrance per page, all disabled under `prefers-reduced-motion`.
ClimateWatch's `.animate-rise` plus its blanket reduced-motion query is the
reference implementation for the rest of the portfolio.

### 2.5 Theme count — corrected rule

**Previous rule (wrong): "a theme toggle exists."**

**Corrected rule: the number of themes is a deliberate, stated choice.** One
committed theme is legitimate and often better — it halves the surface area of
every colour decision and lets ramps be tuned against exactly one canvas. Two
are fine when stated. What is not fine is *drifting* into two by accident, or
shipping a second theme nobody validated.

ClimateWatch is one theme, stated, with every data colour validated against
`#12100C` and `#1B1813` specifically. Correct, and it stays. Falak is two
themes, stated. Both comply.

### 2.6 Quality floor

- A global `:focus-visible` rule plus hand-drawn focus states on custom
  controls. ClimateWatch already passes.
- Every colour that encodes meaning is paired with a second cue — icon, arrow,
  dash pattern, position, or direct label. Already in `CLAUDE.md`; keep.
- Every data drawing has a keyboard and screen-reader path to the same numbers.
  The fingerprint's `sr-only` `<table>` is the pattern; every new layer must
  extend that table, not bypass it.
- No hardcoded hex outside the token file, documented exceptions only.
  ClimateWatch has four undocumented ones (§8).
- A route-level `error.tsx` exists. ClimateWatch has none anywhere.

---

## 3. Identity — what changes and what does not

### 3.1 Frozen

Do not touch, do not "improve," do not re-tune:

- Every colour in `styles/tokens.css`
- The five sequential ramps in `components/fingerprint/ramps.json`
- Fraunces / Inter / JetBrains Mono, their roles, and the `SOFT 30 / WONK 1`
  variation settings on `h1`–`h3`
- The type scale, spacing ramp, radius steps, shadow steps, and `--rim`
- `color-scheme: dark` and the single-theme decision

### 3.2 New: the anomaly ramp

The one genuinely new visual asset. The baseline layer (§5.4) recolours every
cell as a **departure from that calendar month's 1951–1980 average**, which is
where climate signal actually lives — absolute values make a tropical city look
flat, because it is always hot and always wet.

A departure is signed, so this ramp must be **diverging**, not sequential. It
cannot be built by reusing an existing ramp.

Requirements:

- Cool end for below-baseline, warm end for above-baseline, anchored to the
  existing `--rain-blue` and `--heat-orange` hues so it reads as family.
- The midpoint (zero departure) must be a **desaturated warm neutral that is
  visibly distinct from `--null-cell` (`#2A251E`)**. A cell meaning "exactly
  average" and a cell meaning "no data" must never be confusable. Verify this
  pair explicitly and record the result in the token file.
- Symmetric domain: `[-max(|min|,|max|), +max(|min|,|max|)]`, so equal
  departures in either direction carry equal visual weight. Never let the
  renderer derive an asymmetric domain from the data.
- Verified monotonic in L\* and in saturation on each half, per the existing
  ramp discipline in `CLAUDE.md`.
- Stored in `ramps.json` alongside the others, under a key that makes its
  diverging nature explicit (e.g. `anomaly_diverging`).
- A legend that marks the zero point, not just the two ends. This is the one
  ramp where the midpoint carries meaning.

Run the same validator used for the sequential ramps. Do not hand-tune.

### 3.3 The headline sentence

Every city page opens with one computed sentence, set in Fraunces at
`--text-hero`. Not a stat card, not a `<dl>` — a **sentence**, in the display
face, that states the finding:

> Balikpapan is **1.1°C** warmer than its 1951–1980 baseline, and its wet
> season now starts **11 days later** than it did in 1980.

The numbers inside it are the one place JetBrains Mono appears at display size.
`WhatMovedMost` already computes most of this and is currently buried below the
forecast strip; promote its logic to the top of the page.

If a figure is not computable for a region, the sentence degrades to the part
that is, and the missing part is stated as missing — never silently dropped,
never rounded into existence.

---

## 4. Information architecture

Routes are unchanged: `/`, `/city/[slug]`, `/compare`, `/rankings`, `/about`.
What changes is what sits inside them.

### `/city/[slug]` — rebuilt around one object

```
┌──────────────────────────────────────────────────────────────┐
│  masthead: city, province, coordinates, record range         │
├──────────────────────────────────────────────────────────────┤
│  Balikpapan is 1.1°C warmer than its 1951–1980 baseline,     │
│  and its wet season now starts 11 days later than in 1980.   │
│                                     ← Fraunces, --text-hero   │
├──────────────────────────────────────────────────────────────┤
│  variable:  [ Rainfall · Temperature · Hot days · Dry days ] │
│  layers:    [ Baseline ] [ Season ] [ ENSO ] [ Extremes ]    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │      THE FINGERPRINT — whole record, one screen        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│  legend · hovered-cell readout · hovered-year readout        │
├──────────────────────────────────────────────────────────────┤
│  forecast context strip (today vs historical band)           │
├──────────────────────────────────────────────────────────────┤
│  worked example · personal baseline · methodology note       │
└──────────────────────────────────────────────────────────────┘
```

The forecast strip moves **below** the fingerprint. It answers "is today
unusual," a different and smaller question than "has the climate changed" — it
should not sit between the headline and its evidence.

`WorkedExample` survives. It is the one place a reader can watch a derived
number being computed, which matters for a reanalysis-based product. Restyle it
onto the shared `chart-ui.tsx` chrome instead of its bespoke bar strip.

---

## 5. The fingerprint

### 5.1 It fits

Row height is computed, not fixed:

```
rowHeight = clamp(4, floor((availableHeight - axisHeight) / yearCount), 22)
```

At 75 years in a ~700px viewport this lands near 8–9px, which is legible — a
GitHub contribution cell is 10px. Cells stay non-square (a month is wider than
it is tall), so the existing 26–64px responsive width logic is unchanged.

The internal vertical scroll container is removed. Horizontal scroll on narrow
mobile stays, since 12 columns below ~26px each stop being hoverable.

Add a **zoom control** with three stops: whole record (default), decade, single
year. Zoom changes `rowHeight` and the year window; it never changes the data
or the active layers. Default is always whole record — the compressed view is
the product, the expanded view is the detail.

The `sr-only` `<table>` is unaffected by zoom and always contains the full
record.

### 5.2 Layer: Season

Per-year wet-season onset and end, drawn as lines through the grid connecting
each year's onset cell position to the next. Onset is already computed into
`ClimateAnnual` per `CLAUDE.md`'s five-day/40mm rule.

- Onset and end lines in `--drought-amber`, consistent with the existing "trend
  lines are always amber" rule.
- Years with no detectable wet season: the line **breaks**. It does not
  interpolate across the gap. Count the breaks and state the count in the
  layer's caption.
- The linear regression that `SeasonShiftScatter` currently draws becomes a
  second, dashed amber line — the smoothed drift under the noisy actual.

This layer is why the whole record must be visible at once. The drift is a
*tilt*, and a tilt is only perceptible against the full height of the grid.

### 5.3 Layer: ENSO

El Niño and La Niña years marked in the **year gutter** left of the grid, not
as cell tinting — cell colour already carries the variable and must not be
overloaded.

Use the existing `--enso-nino` / `--enso-nina` tokens as a filled bar in the
gutter, plus a dash pattern distinguishing the two, since hue alone is
insufficient per `CLAUDE.md`. `ENSOBadge` is reused in the legend.

`ENSOImpactCard`'s prose finding ("the 2015–16 El Niño cut rainfall by X% here")
survives as a caption beneath the fingerprint when this layer is on. It is a
good sentence; it just should not be its own section 800px from the grid it
describes.

### 5.4 Layer: Baseline — the important one

Recolours every cell with the diverging anomaly ramp (§3.2): each cell shows
its departure from that calendar month's 1951–1980 mean rather than its
absolute value.

This is the layer that makes the app's claim visible. In absolute rainfall a
tropical city is a wall of blue. In anomaly space the recent decades separate
from the early ones and you can see it without being told.

- The baseline window is 1951–1980 and is **stated in the UI**, not buried. It
  is a choice, and a reader who disagrees with it deserves to know it was made.
- `PersonalBaseline` already implements a variant of this with a user-chosen
  year. Wire them together: `PersonalBaseline` becomes the control that changes
  this layer's baseline window, not a separate component with its own
  computation.
- When this layer is on, the sequential legend is replaced by the diverging one
  with its zero marked. Two ramps must never be on screen at once.

### 5.5 Layer: Extremes

Cells **outlined**, not filled, where the month set a record or crossed a
threshold (>35°C days, >100mm days, longest dry spell). Outline, because fill
is taken.

The metric dropdown from `ExtremeDaysChart` becomes this layer's sub-control.
The annual counts that chart plotted stay recoverable by hovering a year row,
which already drives an annual readout in the sidebar.

### 5.6 Layer rules

- Layers are independent toggles, not a radio group — **except** Baseline,
  which is mutually exclusive with the plain variable ramps.
- Layer state lives in the URL (`?layers=season,enso`) so a finding is
  shareable. This matters: `PRD.md` names content creators as a user group, and
  a screenshot plus a URL that reproduces it is the entire sharing loop.
- Every layer extends the `sr-only` table with its own column or note. A layer
  that exists only visually is not finished.
- Maximum three layers at once. Enforce it — the fourth toggle should visibly
  refuse rather than silently degrade the reading.

---

## 6. Rankings become a map

`RankingsTable` and `RecordsBoard` render ~514 cities as tables and
proportional bars — a table of numbers for data that is inherently spatial.

Put a choropleth above the table. The machinery exists: `IndonesiaMap` renders
a d3-geo Mercator projection of a Natural Earth coastline with no tile
dependency, which is exactly what a static export needs.

- Colour cities by the selected metric — the anomaly ramp when the metric is
  signed (warming since 1950), the appropriate sequential ramp when it is not.
- The existing 6-metric segmented control drives both map and table.
- Keep the table below. It is the accessible and precise view, and it is how
  someone finds one specific city.
- Click a city → its page, reusing `IndonesiaMap`'s existing `<Link>` markers.

This is the most shareable image the product can produce, and it is nearly free
from components already built.

---

## 7. Data honesty

`NullDataWarning` is fully built, styled, and has **zero import sites**. That is
not a tidiness problem.

ERA5 is reanalysis — model output constrained by observations, not station
measurement. The product's authority rests on being straight about that. A
component built specifically to flag thin coverage, which never renders, is a
trust bug wearing a design costume.

- Render `NullDataWarning` wherever coverage for the displayed window falls
  below 90%, per `CLAUDE.md`'s Definition of Done: city page, compare page, and
  any ranking row built on a thin region.
- Null cells keep `--null-cell` and stay off every ramp, including the new
  diverging one. Verify against the anomaly midpoint explicitly (§3.2).
- `/about` currently uses a generic `10rem_1fr` label/content grid with nothing
  tying it to the domain. Give it one thing: a **worked trace of a single
  cell** — this coordinate, this ERA5 grid point, this month, these daily
  values, this aggregate, this colour. One cell explained end to end does more
  for credibility than six sections of prose.

---

## 8. Deletions and fixes

- `ExtremeDaysChart`, `SeasonShiftScatter`, `SeasonLengthChart` — absorbed into
  layers; remove the components
- `ENSOImpactCard` as a standalone section — its prose becomes a caption
- The fingerprint's internal vertical scroll container
- `LeadersOverTime`'s standalone four-colour `LINE_COLORS` array — either move
  it into `tokens.css` as a documented categorical set or drop the component;
  it currently breaks the entity-not-metric rule and the centralisation rule at
  once
- The 404 page's eight hardcoded swatches — build that decorative row from
  `ramps.json` instead
- `--canvas` duplicated as a literal in `layout.tsx`'s `viewport.themeColor`
- The `rgb(62 147 208 / 0.22)` focus glow written as a literal that happens to
  match `--rain-blue` — reference the token

Add: `error.tsx` at the app root and on `/city/[slug]`.

Recharts usage drops to `MonthlyBarChart` and the compare panels. If those end
up its only consumers, evaluate removing the dependency — but do not force it.
A bar chart is a bar chart.

---

## 9. Compare

Layers make this page stronger for free: two fingerprints, same variable, same
layers, same zoom, side by side. Two anomaly grids next to each other say more
about two cities than any pair of bar charts.

`--series-1` / `--series-2` entity colouring per `CLAUDE.md` applies to panel
chrome and line charts, **not** to fingerprint cells, which always carry the
variable ramp. State this in the component so the rule is not misapplied later.

---

## 10. Migration order

1. **Fit the grid.** Adaptive `rowHeight`, remove the internal scroll, add the
   three-stop zoom. Ship this alone and look at it before building layers — it
   is the highest-value change here and everything else assumes it.
2. **Headline sentence.** Promote `WhatMovedMost`'s computation to the top of
   the city page, in Fraunces, with graceful degradation for thin regions.
3. **Layer infrastructure.** Toggle state, URL params, the three-layer cap, the
   `sr-only` table extension mechanism. No layers yet.
4. **Baseline layer** and the diverging ramp, validated. Wire `PersonalBaseline`
   to it.
5. **Season layer**, then remove `SeasonShiftScatter` and `SeasonLengthChart`.
6. **ENSO layer**, then fold `ENSOImpactCard` into a caption.
7. **Extremes layer**, then remove `ExtremeDaysChart`.
8. **Rankings map.**
9. **`NullDataWarning` wiring, `error.tsx`, token drift fixes** from §8.
10. **`/about` worked cell trace.**

Check the fingerprint at 375px after steps 1, 4 and 7. Twelve columns plus
layers on a phone is the hardest case in this design.

---

## 11. `CLAUDE.md` amendments required

This document contradicts three presentational lines. Update them rather than
leaving the docs disagreeing:

1. **"height is fixed at 22px"** → row height is adaptive, clamped 4–22px,
   defaulting to whole-record fit.
2. **"Recharts for all other charts"** → narrow to `MonthlyBarChart` and the
   compare panels; time-series across the record is a fingerprint layer, not a
   chart.
3. **The `SeasonShiftScatter` component spec** → replaced by the Season layer
   spec in §5.2. The onset computation itself is unchanged.

Also rename "Iklim" to "ClimateWatch" throughout both docs.

---

## 12. Do not

- Do not re-tune the palette or the five sequential ramps. They were validated
  against these exact surfaces.
- Do not add a light theme.
- Do not let the fingerprint scroll inside itself again, under any framing.
- Do not stack a fourth encoding on the grid.
- Do not substitute 0 for a null, or interpolate the season line across a
  missing year. `CLAUDE.md`'s null rules are absolute and nothing here softens
  them.
- Do not re-add `DataAttribution` per page. It is structural in the footer.
- Do not replace the headline sentence with a stat-card row. The sentence is
  the point; a row of numbers is what the app already does, and is what fails.
