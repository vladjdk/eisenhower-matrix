// CSV-backed task storage. One row per task; the file is re-read on every
// request so hand edits (Numbers, Excel, a text editor) show up on reload.
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// Must match `quadrants` in lib/tasks.ts.
export const QUADRANTS = ['Do first', 'Schedule', 'Delegate', 'Let go'];
export const COLUMNS = ['id', 'title', 'quadrant', 'done', 'due', 'notes', 'sources', 'links', 'x', 'y', 'created_at', 'updated_at'];

export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  text = text.replace(/^﻿/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(f => f !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(f => f !== '')) rows.push(row);
  return rows;
}

const cell = v => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export const toCsv = rows => rows.map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';

function parseLinks(v) {
  try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a.filter(l => l && typeof l.url === 'string').map(l => ({ label: String(l.label ?? ''), url: l.url })) : []; }
  catch { return []; }
}
function quadrantIndex(v) {
  const s = String(v ?? '').trim().toLowerCase();
  const byName = QUADRANTS.findIndex(q => q.toLowerCase() === s);
  if (byName >= 0) return byName;
  const n = Number(s); return Number.isInteger(n) && n >= 0 && n <= 3 ? n : 0;
}
const num = (v, fallback) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : fallback; };

function rowToTask(r) {
  const q = quadrantIndex(r.quadrant);
  return {
    id: r.id || randomUUID(),
    generated: !r.id,
    title: r.title || 'Untitled task',
    notes: r.notes ?? '',
    q,
    x: num(r.x, q % 2 ? 940 : 80),
    y: num(r.y, q >= 2 ? 870 : 240),
    done: /^(true|yes|1|x)$/i.test(String(r.done ?? '').trim()),
    due: /^\d{4}-\d{2}-\d{2}$/.test(r.due ?? '') ? r.due : '',
    sources: parseLinks(r.sources),
    links: parseLinks(r.links),
    created_at: r.created_at ?? '',
    updated_at: r.updated_at ?? '',
  };
}
const taskToRow = ({ generated, ...t }) => [t.id, t.title, QUADRANTS[t.q], t.done ? 'true' : 'false', t.due, t.notes, JSON.stringify(t.sources ?? []), JSON.stringify(t.links ?? []), Math.round(t.x), Math.round(t.y), t.created_at, t.updated_at];

export function createStore(file) {
  async function load() {
    let text;
    try { text = await readFile(file, 'utf8'); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    const [header, ...rows] = parseCsv(text);
    if (!header) return [];
    const cols = header.map(h => h.trim().toLowerCase());
    return rows.map(r => rowToTask(Object.fromEntries(cols.map((c, i) => [c, r[i] ?? '']))));
  }

  async function save(tasks) {
    await mkdir(dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFile(tmp, '﻿' + toCsv([COLUMNS, ...tasks.map(taskToRow)]));
    await copyFile(file, `${file}.bak`).catch(e => { if (e.code !== 'ENOENT') throw e; });
    await rename(tmp, file);
  }

  // Serialize writes so concurrent requests never interleave read-modify-write.
  let queue = Promise.resolve();
  function mutate(fn) {
    const run = queue.then(async () => { const tasks = await load(); fn(tasks); await save(tasks); });
    queue = run.catch(() => {});
    return run;
  }

  return {
    // Rows added by hand without an id get one generated; persist it so the
    // page and the file agree on the id before the next save.
    async list() {
      const tasks = await load();
      if (!tasks.some(t => t.generated)) return tasks;
      await mutate(() => {});
      return load();
    },
    upsert: t => mutate(tasks => {
      const now = new Date().toISOString();
      const i = tasks.findIndex(x => x.id === t.id);
      if (i < 0) { tasks.push({ ...t, sources: t.sources ?? [], links: t.links ?? [], created_at: now, updated_at: now }); return; }
      const prev = tasks[i];
      tasks[i] = { ...prev, ...t, sources: t.sources ?? prev.sources, links: t.links ?? prev.links, updated_at: now };
    }),
    remove: id => mutate(tasks => { const i = tasks.findIndex(x => x.id === id); if (i >= 0) tasks.splice(i, 1); }),
  };
}
