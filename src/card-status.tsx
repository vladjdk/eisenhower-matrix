// Card status labels: how close the deadline is (heat) and how long the task
// has been around (hourglass). Both are derived from the task; nothing here
// is stored except `aged_from`, which a flip resets.
import type { Task } from "@/lib/tasks";

const DAY = 86_400_000;
/** Age at which the hourglass runs out. */
export const HOURGLASS_DAYS = 60;
/** Fresh tasks carry no age label; it appears once a task is this old. */
export const AGE_LABEL_DAYS = 5;

export type Heat = 0 | 1 | 2 | 3 | 4; // later, soon, tomorrow, today, late

export function dueInfo(due: string, now: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return null;
  const [y, m, d] = due.split("-").map(Number);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round(
    (new Date(y, m - 1, d).getTime() - today.getTime()) / DAY,
  );
  const heat: Heat =
    days < 0 ? 4 : days === 0 ? 3 : days === 1 ? 2 : days <= 3 ? 1 : 0;
  const text =
    days < -1
      ? `${-days} days late`
      : days === -1
        ? "1 day late"
        : days === 0
          ? "today"
          : days === 1
            ? "tomorrow"
            : days < 14
              ? `in ${days} days`
              : new Date(y, m - 1, d).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                });
  return { days, heat, text };
}

export function ageInfo(t: Task, now: number) {
  const from = Date.parse(t.aged_from || t.created_at || "");
  const days = Number.isNaN(from)
    ? 0
    : Math.max(0, Math.floor((now - from) / DAY));
  const short =
    days < 14
      ? `${days}d`
      : days < 30
        ? `${Math.floor(days / 7)}w`
        : `${Math.floor(days / 30)}mo`;
  const long =
    days < 14
      ? `${days} days old`
      : days < 30
        ? `${Math.floor(days / 7)} weeks old`
        : days < 60
          ? "1 month old"
          : `${Math.floor(days / 30)} months old`;
  return {
    days,
    short,
    long,
    fraction: Math.min(days / HOURGLASS_DAYS, 1),
    visible: days >= AGE_LABEL_DAYS,
  };
}

export function Hourglass({ fraction }: { fraction: number }) {
  const f = Math.max(0, Math.min(1, fraction));
  return (
    <svg
      className="hourglass"
      width="11"
      height="15"
      viewBox="0 0 24 34"
      aria-hidden="true"
    >
      {f < 1 && <path d={`M7 ${5 + 11 * f} H17 L12 16 Z`} fill="#c98a2e" />}
      {f > 0 && <path d={`M6 29 H18 L12 ${29 - 11 * f} Z`} fill="#c98a2e" />}
      <path
        d="M6 5 C6 12 11 14 11 17 C11 20 6 22 6 29 H18 C18 22 13 20 13 17 C13 14 18 12 18 5 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

/** Shared gradient for every flame; render once per page. */
export function FlameDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="flameG" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff4d2e" />
          <stop offset=".6" stopColor="#ff8a3d" />
          <stop offset="1" stopColor="#ffc24a" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Flame() {
  return (
    <svg
      className="card-flame"
      viewBox="0 0 24 34"
      width="24"
      height="34"
      aria-hidden="true"
    >
      <path
        d="M12 0 C15 8 24 12 24 22 A12 12 0 0 1 0 22 C0 15 7 12 7 5 C9 9 10 10 12 11 C12 7 11 4 12 0 Z"
        fill="url(#flameG)"
      />
      <path
        d="M12 14 C14 18 18 20 18 25 A6 6 0 0 1 6 25 C6 21 10 19 12 14 Z"
        fill="#ffe27a"
      />
    </svg>
  );
}

export function Sparkle({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M12 1 L14.3 9.7 L23 12 L14.3 14.3 L12 23 L9.7 14.3 L1 12 L9.7 9.7 Z"
        fill={color}
      />
    </svg>
  );
}

export function Sprout() {
  return (
    <svg
      className="sprout"
      viewBox="0 0 40 60"
      width="40"
      height="60"
      aria-hidden="true"
    >
      <path
        d="M20 60 C20 46 20 36 20 22"
        stroke="#2fbf8f"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse
        className="leaf"
        cx="12"
        cy="22"
        rx="9"
        ry="5"
        fill="#3cc47c"
        transform="rotate(-30 20 24)"
      />
      <ellipse
        className="leaf"
        cx="28"
        cy="22"
        rx="9"
        ry="5"
        fill="#2fbf8f"
        transform="rotate(30 20 24)"
      />
    </svg>
  );
}

export function Bin() {
  return (
    <svg viewBox="0 0 44 50" width="44" height="50" aria-hidden="true">
      <g className="bin-lid">
        <rect x="4" y="6" width="36" height="5" rx="2.5" fill="#8b95a5" />
        <rect x="17" y="2" width="10" height="5" rx="2" fill="#8b95a5" />
      </g>
      <path d="M8 14 H36 L33 48 H11 Z" fill="#aeb6c2" />
      <path
        d="M16 20 V42 M22 20 V42 M28 20 V42"
        stroke="#8b95a5"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const CONFETTI_COLORS = ["#243cef", "#2fbf8f", "#f5bf45", "#ff7a8a", "#8b5cf6"];
/** Fixed pseudo-random burst so every completion looks the same. */
export const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) =>
    (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
  const ang = -Math.PI / 2 + (r(1) - 0.5) * 2.6;
  const dist = 60 + r(2) * 70;
  const round = i % 3 === 1;
  return {
    color: CONFETTI_COLORS[i % 5],
    dx: Math.cos(ang) * dist,
    dy: Math.sin(ang) * dist + 10 + r(3) * 30,
    rot: 180 + Math.floor(r(4) * 540),
    w: round ? 7 : 6,
    h: round ? 7 : 10,
    round,
    delay: r(5) * 0.08,
  };
});

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
