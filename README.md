# Focus — Eisenhower Matrix

A private, drag-and-drop Eisenhower board. Tasks live on a pannable, zoomable canvas split into four quadrants:

| | Urgent | Not urgent |
|---|---|---|
| **Important** | **Do first** — important and time-sensitive | **Schedule** — protect time for meaningful work |
| **Not important** | **Delegate** — keep it moving without doing it all | **Let go** — not everything needs your attention |

## Features

- Drag cards between quadrants; pan and zoom the canvas, reset the view
- Per-task notes, due date, completion toggle, and lists of sources and links
- Keyboard support for moving and opening cards
- Persistence in Cloudflare D1 (SQLite) via a small `/api/tasks` route

The board starts empty. No task data ships with this repo.

## Stack

[vinext](https://github.com/cloudflare/vinext) (Next.js App Router on Vite) · React 19 · Tailwind 4 · shadcn/ui · Drizzle + Cloudflare D1 · Wrangler

## Run locally

Requires Node.js `>=22.13.0`.

```sh
npm run install:ci
npm run build          # generates dist/server/wrangler.json
for f in drizzle/*.sql; do
  node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js \
    d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file "$f"
done
npm run dev            # http://localhost:5173
```

`npm start` serves the built Worker locally through Wrangler instead of the dev server. Local database state lives in `.wrangler/state` and is git-ignored.

## Layout

- `app/page.tsx` — the board UI
- `app/api/tasks/route.ts` — GET / PUT / DELETE for tasks
- `lib/tasks.ts` — task types, quadrant definitions, card placement
- `db/schema.ts`, `drizzle/` — schema and migrations
- `components/ui/` — shadcn/ui components

## Schema changes

Edit `db/schema.ts`, run `npm run db:generate`, then apply the new migration with the `d1 execute` command above.
