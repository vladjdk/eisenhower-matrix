// Pieces for the "Done & dusted" list: grouping by when a task was finished,
// friendly timestamps, and the two little illustrations.
import type { Task } from "@/lib/tasks";

const DAY = 86_400_000;

function startOfDay(ms: number) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Newest first, bucketed into Today / Yesterday / This week / Earlier. */
export function groupDone(done: Task[], now: number) {
  const today = startOfDay(now);
  const buckets: { label: string; items: Task[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  const at = (t: Task) => Date.parse(t.done_at || "") || 0;
  for (const t of [...done].sort((a, b) => at(b) - at(a))) {
    const ms = at(t);
    const i = !ms
      ? 3
      : ms >= today
        ? 0
        : ms >= today - DAY
          ? 1
          : ms >= today - 6 * DAY
            ? 2
            : 3;
    buckets[i].items.push(t);
  }
  return buckets.filter((b) => b.items.length);
}

export function whenDone(iso: string, now: number) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const d = new Date(ms);
  if (ms >= startOfDay(now) - DAY)
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  if (ms >= startOfDay(now) - 6 * DAY)
    return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** The logo's blue tile, wearing a check mark and a couple of sparkles. */
export function DoneBadge() {
  return (
    <svg
      className="done-badge"
      viewBox="0 0 56 56"
      width="52"
      height="52"
      aria-hidden="true"
    >
      <rect x="6" y="8" width="42" height="42" rx="13" fill="#2fbf8f" />
      <path
        d="M17 29.5l7 7L38 21"
        stroke="#fff"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="tw1"
        d="M49 4 L50.4 8.6 L55 10 L50.4 11.4 L49 16 L47.6 11.4 L43 10 L47.6 8.6 Z"
        fill="#f5bf45"
      />
      <path
        className="tw2"
        d="M8 44 L8.9 46.6 L11.5 47.5 L8.9 48.4 L8 51 L7.1 48.4 L4.5 47.5 L7.1 46.6 Z"
        fill="#243cef"
      />
    </svg>
  );
}

/** Empty state: the four tiles waiting, the blue one hopeful. */
export function EmptyDone() {
  return (
    <svg viewBox="0 0 120 96" width="120" height="96" aria-hidden="true">
      <rect
        x="18"
        y="16"
        width="36"
        height="36"
        rx="10"
        fill="#243cef"
        className="hop"
      />
      <circle cx="30" cy="30" r="2.6" fill="#fff" className="hop" />
      <circle cx="42" cy="30" r="2.6" fill="#fff" className="hop" />
      <path
        d="M29 38 Q36 43 43 38"
        stroke="#fff"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        className="hop"
      />
      <rect
        x="62"
        y="16"
        width="36"
        height="36"
        rx="10"
        fill="#2fbf8f"
        opacity=".35"
      />
      <rect
        x="18"
        y="58"
        width="36"
        height="36"
        rx="10"
        fill="#f5bf45"
        opacity=".35"
      />
      <rect
        x="62"
        y="58"
        width="36"
        height="36"
        rx="10"
        fill="#c5cdd8"
        opacity=".5"
      />
    </svg>
  );
}

function longDate(iso: string | undefined, withTime = false) {
  const ms = Date.parse(iso || "");
  if (Number.isNaN(ms)) return "";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(ms).getFullYear() === new Date().getFullYear()
        ? undefined
        : "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

function dueDate(due: string) {
  const [y, m, d] = due.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Read-only replica of the card as it was when it was checked off. */
export function DoneCard({ task: t, id }: { task: Task; id: string }) {
  const made = Date.parse(t.created_at || ""),
    finished = Date.parse(t.done_at || "");
  const took =
    !Number.isNaN(made) && !Number.isNaN(finished)
      ? Math.max(0, Math.round((finished - made) / DAY))
      : null;
  const links = [
    ...(t.sources ?? []).map((l) => ({ ...l, kind: "Source" })),
    ...(t.links ?? []).map((l) => ({ ...l, kind: "Link" })),
  ];
  return (
    <div className={`done-card done-card-q${t.q}`} id={id}>
      {t.due && (
        <span className="done-card-due">
          Due {dueDate(t.due)}
          {!Number.isNaN(finished) &&
            (() => {
              const [y, m, d] = t.due.split("-").map(Number);
              const endOfDue = new Date(y, m - 1, d, 23, 59, 59).getTime();
              return finished <= endOfDue ? (
                <b className="on-time">on time</b>
              ) : (
                <b className="late">late</b>
              );
            })()}
        </span>
      )}
      <h4>{t.title}</h4>
      {t.notes ? (
        <p className="done-card-notes">{t.notes}</p>
      ) : (
        <p className="done-card-notes empty">No notes on this one.</p>
      )}
      {links.length > 0 && (
        <ul className="done-card-links">
          {links.map((l, i) => (
            <li key={i}>
              <span>{l.kind}</span>
              <a href={l.url} target="_blank" rel="noopener noreferrer">
                {l.label || l.url}
              </a>
            </li>
          ))}
        </ul>
      )}
      <div className="done-card-foot">
        {!Number.isNaN(made) && <span>Created {longDate(t.created_at)}</span>}
        {!Number.isNaN(finished) && (
          <span>Done {longDate(t.done_at, true)}</span>
        )}
        {took !== null && (
          <span className="took">
            {took === 0
              ? "Same-day finish"
              : `Took ${took} day${took === 1 ? "" : "s"}`}
          </span>
        )}
      </div>
    </div>
  );
}
