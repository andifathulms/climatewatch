"use client";

/**
 * A polite live region for "the result you are looking at just changed".
 *
 * Every selector on this site swaps its entire result silently: changing the
 * fingerprint variable redraws 924 cells, changing the extremes metric
 * redraws the series, changing the baseline year rewrites the headline
 * figure. A sighted user sees the change; a screen-reader user is given no
 * signal that anything happened at all. (WCAG 4.1.3)
 *
 * Deliberately narrow:
 *  - aria-live="polite", never assertive — this is a consequence of the
 *    user's own action, not an interruption.
 *  - The message states the *outcome*, not the control. The control already
 *    announced itself when it was operated; repeating it would be chatter.
 *  - Rendered empty on the server and populated only on change, so it never
 *    announces on page load.
 */
export default function LiveAnnouncement({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}
