import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Minus,
  Maximize,
  MousePointer2,
  Hand,
  Check,
  Grip,
  X,
  RotateCcw,
  Trash2,
  Link2,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  seedTasks,
  type Task,
  type Link,
  quadrants,
  positionFor,
} from "@/lib/tasks";
import {
  ageInfo,
  Bin,
  CalendarIcon,
  CONFETTI,
  dueInfo,
  Flame,
  FlameDefs,
  Hourglass,
  prefersReducedMotion,
  Sparkle,
  Sprout,
} from "./card-status";

const HEAT_CLASS = ["", "heat-soon", "heat-warm", "heat-hot", "heat-late"];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cleanLinks(items: Link[] = []) {
  return items
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.url)
    .map((l) => ({ ...l, label: l.label || hostOf(l.url) }));
}
function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
function LinkEditor({
  title,
  items = [],
  onChange,
}: {
  title: string;
  items?: Link[];
  onChange: (v: Link[]) => void;
}) {
  const set = (i: number, p: Partial<Link>) =>
    onChange(items.map((l, j) => (j === i ? { ...l, ...p } : l)));
  return (
    <div className="link-editor">
      <div className="link-head">
        <span>{title}</span>
        <button
          type="button"
          onClick={() => onChange([...items, { label: "", url: "" }])}
        >
          <Plus size={14} />
          Add
        </button>
      </div>
      {items.map((l, i) => (
        <div className="link-row" key={i}>
          <input
            aria-label={`${title} name`}
            placeholder="Name"
            maxLength={200}
            value={l.label}
            onChange={(e) => set(i, { label: e.target.value })}
          />
          <input
            aria-label={`${title} URL`}
            type="url"
            pattern="https?://.+"
            placeholder="https://…"
            maxLength={2000}
            value={l.url}
            onChange={(e) => set(i, { url: e.target.value })}
          />
          {/^https?:\/\//i.test(l.url) && (
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${l.label || "link"}`}
            >
              <ExternalLink size={15} />
            </a>
          )}
          <button
            type="button"
            aria-label="Remove link"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(seedTasks),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("Loading your board…");
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.75 }),
    [mode, setMode] = useState("select"),
    [dragging, setDragging] = useState<string | null>(null),
    [over, setOver] = useState<number | null>(null);
  const [edit, setEdit] = useState<Task | null>(null),
    [completed, setCompleted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const viewport = useRef<HTMLDivElement>(null),
    tasksRef = useRef(tasks),
    viewRef = useRef(view),
    gesture = useRef<any>(null),
    space = useRef(false);
  tasksRef.current = tasks;
  viewRef.current = view;
  // Animation state: which cards are mid-sprout / mid-completion / mid-toss.
  const [sprouting, setSprouting] = useState<string[]>([]),
    [completing, setCompleting] = useState<string[]>([]),
    [tossing, setTossing] = useState<string[]>([]),
    [confirmToss, setConfirmToss] = useState<Task | null>(null),
    [bump, setBump] = useState(false),
    [now, setNow] = useState(() => Date.now());
  const cardEls = useRef(new Map<string, HTMLElement>()),
    completedBtn = useRef<HTMLButtonElement>(null);
  const animating = (id: string) =>
    completing.includes(id) || tossing.includes(id);
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 5 * 60_000);
    return () => clearInterval(tick);
  }, []);
  function fit() {
    const r = viewport.current?.getBoundingClientRect();
    if (!r) return;
    const scale = Math.min((r.width - 48) / 1760, (r.height - 48) / 1460, 1);
    setView({
      x: (r.width - 1760 * scale) / 2,
      y: (r.height - 1460 * scale) / 2,
      scale,
    });
  }
  async function load() {
    setStatus("Loading your board…");
    try {
      const r = await fetch("/api/tasks");
      if (!r.ok) throw Error();
      const d = (await r.json()) as { tasks: Task[] };
      setTasks(d.tasks);
      setReady(true);
      setStatus("All changes saved");
      setError("");
    } catch {
      setStatus("Could not load board");
      setError("Your board could not be loaded. Please retry.");
    }
  }
  useEffect(() => {
    fit();
    void load();
    const resize = () => fit();
    window.addEventListener("resize", resize);
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)
      ) {
        space.current = true;
        e.preventDefault();
      }
    };
    const up = () => (space.current = false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  async function persist(t: Task, remove = false) {
    if (!ready) throw Error("Board is not loaded");
    setStatus("Saving…");
    const r = await fetch("/api/tasks", {
      method: remove ? "DELETE" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
    if (!r.ok) {
      setStatus("Changes not saved");
      throw Error(
        "Could not save. Your previous board is unchanged. Please try again.",
      );
    }
    setTasks((prev) =>
      remove
        ? prev.filter((a) => a.id !== t.id)
        : prev.some((a) => a.id === t.id)
          ? prev.map((a) => (a.id === t.id ? t : a))
          : [...prev, t],
    );
    setStatus("All changes saved");
  }
  async function change(t: Task) {
    try {
      await persist(t);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function zoom(mult: number) {
    const r = viewport.current!.getBoundingClientRect();
    setView((v) => {
      const scale = Math.max(0.25, Math.min(1.6, v.scale * mult));
      return {
        scale,
        x: r.width / 2 - ((r.width / 2 - v.x) * scale) / v.scale,
        y: r.height / 2 - ((r.height / 2 - v.y) * scale) / v.scale,
      };
    });
  }
  function start(e: React.PointerEvent, t?: Task) {
    if (e.button !== 0 && e.button !== 1) return;
    const middle = e.button === 1;
    if (!middle && (e.target as HTMLElement).closest("button,a")) return;
    const pan = middle || !t || mode === "hand" || space.current;
    if (!pan && (!ready || animating(t!.id))) return;
    if (middle) e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = {
      id: pan ? null : t!.id,
      startX: e.clientX,
      startY: e.clientY,
      view: { ...viewRef.current },
      task: t ? { ...t } : null,
      moved: false,
    };
    if (!pan) setDragging(t!.id);
  }
  function move(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.startX,
      dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) g.moved = true;
    if (!g.id) {
      setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
      return;
    }
    const x = Math.max(
        24,
        Math.min(1458, g.task.x + dx / viewRef.current.scale),
      ),
      y = Math.max(105, Math.min(1236, g.task.y + dy / viewRef.current.scale));
    setTasks((prev) => prev.map((t) => (t.id === g.id ? { ...t, x, y } : t)));
    setOver((y + 65 >= 795 ? 2 : 0) + (x + 137 >= 880 ? 1 : 0));
  }
  async function end() {
    const g = gesture.current;
    gesture.current = null;
    setDragging(null);
    setOver(null);
    if (!g?.id) return;
    if (!g.moved) {
      setEdit(g.task);
      return;
    }
    const moved = tasksRef.current.find((t) => t.id === g.id)!;
    const q = (moved.y + 65 >= 795 ? 2 : 0) + (moved.x + 137 >= 880 ? 1 : 0);
    const x = Math.max(q % 2 ? 910 : 48, Math.min(q % 2 ? 1442 : 582, moved.x)),
      y = Math.max(q >= 2 ? 860 : 230, Math.min(q >= 2 ? 1236 : 606, moved.y));
    try {
      await persist({ ...moved, x, y, q });
    } catch (e) {
      setTasks((prev) => prev.map((t) => (t.id === g.id ? g.task : t)));
      setError((e as Error).message);
    }
  }
  function add(q = 0) {
    setEdit({
      id: crypto.randomUUID(),
      title: "",
      notes: "",
      q,
      ...positionFor(q, tasks.filter((t) => t.q === q && !t.done).length),
      done: false,
      due: "",
      sources: [],
      links: [],
    });
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit || !edit.title.trim()) return;
    const isNew = !tasks.some((t) => t.id === edit.id);
    setBusy(true);
    try {
      await persist({
        ...edit,
        title: edit.title.trim(),
        sources: cleanLinks(edit.sources),
        links: cleanLinks(edit.links),
        ...(isNew ? { created_at: new Date().toISOString() } : {}),
      });
      setEdit(null);
      setError("");
      if (isNew && !prefersReducedMotion()) {
        setSprouting((s) => [...s, edit.id]);
        setTimeout(
          () => setSprouting((s) => s.filter((id) => id !== edit.id)),
          1500,
        );
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  /** Check fills, confetti bursts, then the card flies into the Completed counter. */
  async function complete(t: Task) {
    if (animating(t.id)) return;
    const el = cardEls.current.get(t.id),
      target = completedBtn.current;
    if (prefersReducedMotion() || !el || !target)
      return change({ ...t, done: true });
    setCompleting((c) => [...c, t.id]);
    await wait(1050);
    const from = el.getBoundingClientRect(),
      to = target.getBoundingClientRect(),
      scale = viewRef.current.scale;
    const dx = (to.left + to.width / 2 - (from.left + from.width / 2)) / scale,
      dy = (to.top + to.height / 2 - (from.top + from.height / 2)) / scale;
    const fly = el.animate(
      [
        { transform: "none", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.12)`, opacity: 0 },
      ],
      { duration: 520, easing: "cubic-bezier(.5,0,.8,.6)", fill: "forwards" },
    );
    await fly.finished;
    try {
      await persist({ ...t, done: true });
      setBump(true);
      setTimeout(() => setBump(false), 650);
    } catch (e) {
      fly.cancel();
      setError((e as Error).message);
    } finally {
      setCompleting((c) => c.filter((id) => id !== t.id));
    }
  }
  /** After confirmation: the card crumples into a paper ball and lands in a bin. */
  async function toss(t: Task) {
    setConfirmToss(null);
    const el = cardEls.current.get(t.id);
    if (prefersReducedMotion() || !el) {
      try {
        await persist(t, true);
      } catch (e) {
        setError((e as Error).message);
      }
      return;
    }
    setTossing((s) => [...s, t.id]);
    // The bin sits just past the card's bottom-right corner (see .toss-bin).
    const dx = el.offsetWidth / 2 + 44,
      dy = el.offsetHeight / 2 - 10;
    const ball = "#eef0f4";
    const crumple = el.animate(
      [
        { offset: 0, transform: "none", borderRadius: "9px" },
        { offset: 0.15, transform: "rotate(-3deg) scale(1.03)" },
        {
          offset: 0.4,
          transform: "scale(.62,.5) rotate(12deg)",
          borderRadius: "40px",
        },
        {
          offset: 0.56,
          transform: "scale(.24) rotate(40deg)",
          borderRadius: "50%",
          background: ball,
        },
        {
          offset: 0.72,
          transform: `translate(${dx * 0.5}px, -90px) scale(.2) rotate(160deg)`,
          borderRadius: "50%",
          background: ball,
        },
        {
          offset: 0.9,
          transform: `translate(${dx}px, ${dy - 24}px) scale(.16) rotate(300deg)`,
          borderRadius: "50%",
          background: ball,
          opacity: 1,
        },
        {
          offset: 1,
          transform: `translate(${dx}px, ${dy}px) scale(.1) rotate(330deg)`,
          borderRadius: "50%",
          background: ball,
          opacity: 0,
        },
      ],
      { duration: 1250, easing: "cubic-bezier(.45,0,.55,1)", fill: "forwards" },
    );
    await crumple.finished;
    await wait(350);
    try {
      await persist(t, true);
    } catch (e) {
      crumple.cancel();
      setError((e as Error).message);
    } finally {
      setTossing((s) => s.filter((id) => id !== t.id));
    }
  }
  /** Restart a task's hourglass once it has run out. */
  function flip(t: Task) {
    void change({ ...t, aged_from: new Date().toISOString() });
  }
  const actionsRef = useRef({ persist, ready });
  actionsRef.current = { persist, ready };
  useEffect(() => {
    const context = (document as any).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: any) => {
      try {
        Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {}
    };
    register({
      name: "list_board_tasks",
      description: "Read tasks and their Eisenhower quadrants.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: () => ({ tasks: tasksRef.current }),
    });
    register({
      name: "move_board_task",
      description:
        "Move an existing task to an Eisenhower quadrant and save its position.",
      inputSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          quadrant: { type: "integer", minimum: 0, maximum: 3 },
        },
        required: ["id", "quadrant"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async (input: any) => {
        if (
          !input ||
          typeof input.id !== "string" ||
          !Number.isInteger(input.quadrant) ||
          input.quadrant < 0 ||
          input.quadrant > 3
        )
          throw Error("A task ID and quadrant from 0 to 3 are required.");
        const t = tasksRef.current.find((t) => t.id === input.id);
        if (!t) throw Error("Task not found");
        if (!actionsRef.current.ready) throw Error("Board is not loaded");
        const q = input.quadrant;
        await actionsRef.current.persist({
          ...t,
          q,
          ...positionFor(
            q,
            tasksRef.current.filter(
              (a) => a.q === q && !a.done && a.id !== t.id,
            ).length,
          ),
        });
        return { id: t.id, quadrant: q };
      },
    });
    return () => lifecycle.abort();
  }, []);
  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left,
        py = e.clientY - rect.top;
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? rect.height : 1);
      setView((v) => {
        const scale = Math.max(
          0.25,
          Math.min(1.6, v.scale * Math.exp(-delta * 0.002)),
        );
        return {
          scale,
          x: px - ((px - v.x) * scale) / v.scale,
          y: py - ((py - v.y) * scale) / v.scale,
        };
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const count = tasks.filter((t) => t.done).length;
  return (
    <main className="app">
      <FlameDefs />
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={34} height={34} />
          <div>
            <h1>Focus</h1>
          </div>
        </div>
        <div className="task-count" aria-live="polite">
          {tasks.filter((t) => !t.done).length} tasks
        </div>
        <div className="header-actions">
          <button
            ref={completedBtn}
            className="plain"
            onClick={() => setCompleted(true)}
          >
            <Check size={17} />
            <span>Completed</span>
            <b className={bump ? "bump" : ""}>{count}</b>
          </button>
          <button className="primary" disabled={!ready} onClick={() => add()}>
            <Plus size={18} /> Add task
          </button>
        </div>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          {!ready && <button onClick={load}>Retry</button>}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div
        ref={viewport}
        className={"viewport " + (mode === "hand" ? "pan-mode" : "")}
        onPointerDown={(e) => start(e)}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={() => {
          const g = gesture.current;
          if (g?.id)
            setTasks((p) => p.map((t) => (t.id === g.id ? g.task : t)));
          gesture.current = null;
          setDragging(null);
          setOver(null);
        }}
      >
        <div
          className="canvas"
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.scale})`,
          }}
        >
          <div className="column-label urgent">URGENT</div>
          <div className="column-label later">NOT URGENT</div>
          <div className="row-label important">IMPORTANT</div>
          <div className="row-label less-important">LESS IMPORTANT</div>
          {quadrants.map((q, i) => (
            <section
              key={q.name}
              className={`quadrant q${i} ${over === i ? "drop-active" : ""}`}
              style={{ left: i % 2 ? 900 : 40, top: i >= 2 ? 800 : 170 }}
            >
              <div className="quad-heading">
                <button
                  aria-label={`Add task to ${q.name}`}
                  disabled={!ready}
                  onClick={() => add(i)}
                >
                  <Plus size={21} />
                </button>
              </div>
            </section>
          ))}
          {tasks
            .filter((t) => !t.done)
            .map((t) => {
              const due = dueInfo(t.due, now),
                age = ageInfo(t, now),
                timeUp = !due && age.fraction >= 1;
              const fx = sprouting.includes(t.id)
                ? "sprouting"
                : completing.includes(t.id)
                  ? "completing"
                  : tossing.includes(t.id)
                    ? "tossing"
                    : "";
              return (
                <article
                  key={t.id}
                  ref={(el) => {
                    if (el) cardEls.current.set(t.id, el);
                    else cardEls.current.delete(t.id);
                  }}
                  className={`task-card card-q${t.q} ${dragging === t.id ? "dragging" : ""} ${due ? HEAT_CLASS[due.heat] : ""} ${fx}`}
                  style={{
                    left: t.x,
                    top: t.y,
                    zIndex: dragging === t.id ? 20 : 2,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    start(e, t);
                  }}
                  tabIndex={0}
                  aria-label={`${t.title}. ${quadrants[t.q].name}. Press Enter to edit. Alt plus arrow keys moves between quadrants.`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEdit(t);
                    if (
                      e.altKey &&
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(e.key)
                    ) {
                      e.preventDefault();
                      const col = t.q % 2,
                        row = Math.floor(t.q / 2);
                      const q =
                        e.key === "ArrowLeft"
                          ? row * 2
                          : e.key === "ArrowRight"
                            ? row * 2 + 1
                            : e.key === "ArrowUp"
                              ? col
                              : col + 2;
                      void change({
                        ...t,
                        q,
                        ...positionFor(
                          q,
                          tasks.filter(
                            (a) => a.q === q && !a.done && a.id !== t.id,
                          ).length,
                        ),
                      });
                    }
                  }}
                >
                  <div className="card-top">
                    <div className="chips">
                      {timeUp ? (
                        <button
                          type="button"
                          className="chip chip-age time-up"
                          title="Restart this task's hourglass"
                          onClick={() => flip(t)}
                        >
                          <Hourglass fraction={1} />
                          time is up · flip it?
                        </button>
                      ) : (
                        age.visible && (
                          <span
                            className="chip chip-age"
                            title={`Created ${age.long.replace(" old", " ago")}`}
                          >
                            <Hourglass fraction={age.fraction} />
                            {due ? age.short : age.long}
                          </span>
                        )
                      )}
                      {due && (
                        <span
                          className={`chip chip-due due-${due.heat}`}
                          title={`Due ${t.due}`}
                        >
                          <CalendarIcon />
                          {due.text}
                        </span>
                      )}
                    </div>
                    <Grip size={16} />
                  </div>
                  {due?.heat === 4 && <Flame />}
                  <h4>{t.title}</h4>
                  {t.notes && <p>{t.notes}</p>}
                  <div className="card-bottom">
                    <span className="card-links">
                      {t.sources?.[0] && (
                        <a
                          href={t.sources[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t.sources[0].url}
                        >
                          <Link2 size={13} />
                          {t.sources[0].label}
                        </a>
                      )}
                      {(t.sources?.length ?? 0) + (t.links?.length ?? 0) >
                        (t.sources?.[0] ? 1 : 0) && (
                        <em>
                          +
                          {(t.sources?.length ?? 0) +
                            (t.links?.length ?? 0) -
                            (t.sources?.[0] ? 1 : 0)}
                        </em>
                      )}
                    </span>
                    <span className="card-actions">
                      <button
                        className="card-trash"
                        aria-label={`Delete ${t.title}`}
                        onClick={() => setConfirmToss(t)}
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        className="card-check"
                        aria-label={`Complete ${t.title}`}
                        onClick={() => complete(t)}
                      >
                        <Check size={15} />
                      </button>
                    </span>
                  </div>
                  {fx === "completing" &&
                    CONFETTI.map((c, i) => (
                      <span
                        key={i}
                        className="confetti"
                        style={
                          {
                            background: c.color,
                            width: c.w,
                            height: c.h,
                            borderRadius: c.round ? "50%" : 2,
                            animationDelay: `${0.45 + c.delay}s`,
                            "--dx": `${c.dx}px`,
                            "--dy": `${c.dy}px`,
                            "--r": `${c.rot}deg`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                </article>
              );
            })}
          {/* Effects that sit beside a card rather than inside it. */}
          {tasks
            .filter((t) => sprouting.includes(t.id) || tossing.includes(t.id))
            .map((t) =>
              sprouting.includes(t.id) ? (
                <div
                  key={`fx-${t.id}`}
                  className="sprout-fx"
                  style={{ left: t.x, top: t.y }}
                  aria-hidden="true"
                >
                  <Sprout />
                  <span className="spark s1">
                    <Sparkle color="#2fbf8f" />
                  </span>
                  <span className="spark s2">
                    <Sparkle color="#f5bf45" />
                  </span>
                  <span className="spark s3">
                    <Sparkle color="#2fbf8f" />
                  </span>
                </div>
              ) : (
                <div
                  key={`fx-${t.id}`}
                  className="toss-bin"
                  style={{ left: t.x, top: t.y }}
                  aria-hidden="true"
                >
                  <Bin />
                </div>
              ),
            )}
        </div>
      </div>
      <footer>
        <div className="toolbox">
          <button
            className={mode === "select" ? "active" : ""}
            aria-label="Select and move cards"
            onClick={() => setMode("select")}
          >
            <MousePointer2 size={19} />
          </button>
          <button
            className={mode === "hand" ? "active" : ""}
            aria-label="Pan canvas"
            onClick={() => setMode("hand")}
          >
            <Hand size={19} />
          </button>
          <i />
          <button aria-label="Zoom out" onClick={() => zoom(0.8)}>
            <Minus size={17} />
          </button>
          <span>{Math.round(view.scale * 100)}%</span>
          <button aria-label="Zoom in" onClick={() => zoom(1.25)}>
            <Plus size={17} />
          </button>
          <i />
          <button className="reset-view" aria-label="Reset view" onClick={fit}>
            <Maximize size={18} />
            <span>Reset view</span>
          </button>
        </div>
      </footer>
      <Dialog
        open={!!edit}
        onOpenChange={(o) => {
          if (!o && !busy) setEdit(null);
        }}
      >
        <DialogContent
          className="task-dialog note-editor"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Edit note</DialogTitle>
          {edit && (
            <form onSubmit={saveEdit}>
              <input
                className="note-title"
                aria-label="Task title"
                autoFocus
                required
                maxLength={160}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="Untitled task"
              />
              <textarea
                className="note-body"
                aria-label="Task notes"
                maxLength={2000}
                value={edit.notes}
                onChange={(e) => setEdit({ ...edit, notes: e.target.value })}
                placeholder="Add a note…"
              />
              <label className="note-date">
                Date
                <input
                  type="date"
                  value={edit.due}
                  onChange={(e) => setEdit({ ...edit, due: e.target.value })}
                />
              </label>
              <LinkEditor
                title="Sources"
                items={edit.sources}
                onChange={(sources) => setEdit({ ...edit, sources })}
              />
              <LinkEditor
                title="Links"
                items={edit.links}
                onChange={(links) => setEdit({ ...edit, links })}
              />
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                {tasks.some((t) => t.id === edit.id) && (
                  <button
                    type="button"
                    className="delete"
                    aria-label="Delete task"
                    disabled={busy}
                    onClick={() => {
                      const saved = tasks.find((t) => t.id === edit.id);
                      setEdit(null);
                      if (saved) setConfirmToss(saved);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
                <button
                  type="submit"
                  className="primary"
                  disabled={busy || !edit.title.trim()}
                >
                  {busy ? "Saving…" : "Done"}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!confirmToss}
        onOpenChange={(o) => {
          if (!o) setConfirmToss(null);
        }}
      >
        <DialogContent className="toss-dialog" showCloseButton={false}>
          <div className="toss-icon" aria-hidden="true">
            <Trash2 size={20} />
          </div>
          <DialogTitle>Toss this task?</DialogTitle>
          <DialogDescription>
            “{confirmToss?.title}” gets crumpled up and thrown away. This can’t
            be undone.
          </DialogDescription>
          <div className="toss-actions">
            <button
              type="button"
              className="keep"
              autoFocus
              onClick={() => setConfirmToss(null)}
            >
              Keep it
            </button>
            <button
              type="button"
              className="toss"
              onClick={() => confirmToss && toss(confirmToss)}
            >
              Toss it
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={completed} onOpenChange={setCompleted}>
        <DialogContent>
          <DialogTitle>Completed tasks</DialogTitle>
          <DialogDescription>
            {count
              ? `${count} things off your plate.`
              : "Your finished tasks will appear here."}
          </DialogDescription>
          <div className="completed-list">
            {tasks
              .filter((t) => t.done)
              .map((t) => (
                <div key={t.id}>
                  <span>{t.title}</span>
                  <button
                    aria-label={`Restore ${t.title}`}
                    onClick={() => change({ ...t, done: false })}
                  >
                    <RotateCcw size={17} />
                  </button>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
