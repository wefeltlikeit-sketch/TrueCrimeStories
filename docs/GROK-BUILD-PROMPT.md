# THE BOARD — Grok Build Prompt

Repo this must land in: `https://github.com/wefeltlikeit-sketch/TrueCrimeStories`
Host: Netlify, connected to that GitHub repo, deploy on every push to `main`.

Copy everything below the line into Grok Build Mode. After the preview works, export the source and commit it to `main` in that repo (replace the placeholder `index.html`).

---

Build a single-page web app called **THE BOARD** — a personal true-crime investigation wall for following current Court TV cases, trial news, and private notes.

This is a gift-quality tool for a friend who lives on Court TV and current cases. It should feel like walking into a detective’s corkboard at 1 a.m.: analog, tactile, slightly obsessive, never cartoonish and never gore.

## Target repo and host (do not ignore)

The project already lives at:

`https://github.com/wefeltlikeit-sketch/TrueCrimeStories`

Netlify will publish whatever is on `main`.

Constraints because of that:

- Produce a **static frontend only**. No server, no database, no auth.
- Prefer a single `index.html` + CSS + JS (or a tiny Vite app whose `npm run build` emits `dist/`).
- If you emit a bundler project, include `package.json` with `"build"` and keep the app working as static files.
- Use **hash routes only**: `#board` `#docket` `#wire` `#notebook`. Netlify already has a `/* → /index.html` fallback, but hash routes mean deep links work even as a file open.
- Do not invent API keys. Do not add `.env` secrets. v1 runs on public RSS + bundled fallback data.
- Do not delete `netlify.toml`, `README.md`, or `docs/GROK-BUILD-PROMPT.md` if they already exist; keep them and replace only the placeholder page / add the app files.
- All user state in `localStorage` under the versioned key `the-board/v1`.
- Page title: `THE BOARD — current cases`
- Favicon: a red pushpin.

## Product promise

A corkboard you can pin cases to, string them together, drop sticky notes on, and keep a live ticker of Court TV / trial news. The user owns the board. News is a feed. Cases are files. Notes stay private in the browser.

## Visual language (non-negotiable)

- Full-viewport **corkboard**: warm stained cork texture, subtle grain, slight vignette at the edges.
- Items sit on the board as physical objects with soft drop shadows, slight rotation (±1–4deg), paper grain, torn-tape corners, pushpin heads.
- Palette:
  - cork: #c4a574 / #b0894f
  - aged paper: #f3e6c4 / #efe0b8
  - ink: #1a1410
  - blood-red string and pins: #8b1e1e / #c0392b
  - manila folder: #e8d5a3
  - sticky notes: #f5e27a, #f7c59f, #c5e0b4
  - newsprint gray: #2b2b2b on #f7f1e3
  - muted teal evidence tag: #2f5d50
- Typography:
  - Display / case titles: a condensed grotesque or stencil-adjacent sans (think “EVIDENCE” stamps)
  - Body: a readable serif for clippings (Source Serif, Fraunces, or similar)
  - Meta / timestamps: monospaced typewriter (IBM Plex Mono or equivalent)
- Red string: SVG paths connecting pinned cases when the user links them. Strings sag slightly. Pins are glossy round heads.
- Polaroid-style photo frames for case avatars (use tasteful generated or placeholder portraits — **no crime-scene, autopsy, blood, or victim-injury imagery ever**).
- A faint overhead lamp / film-grain overlay. Keep it visual, no audio.
- Responsive: on mobile the corkboard becomes a stacked case-file feed; strings hide; notes become a bottom sheet.

Do **not** make it look like a generic Tailwind SaaS dashboard, Law & Order logo pastiche, or horror-movie splash page.

## Information architecture

One app shell with four modes, switchable from a thin filmstrip / evidence-ruler nav at the top:

1. **BOARD** — spatial corkboard of pinned cases
2. **DOCKET** — list/table of all tracked cases with filters
3. **WIRE** — live news ticker + article cards (Court TV first)
4. **NOTEBOOK** — private notes, tagged to cases or free-floating

Persistent chrome:
- Wordmark: THE BOARD
- Subline: “Current cases · Court TV wire · private notes”
- Search that filters cases + notes + headlines
- “Add case” and “Add note” buttons styled as stamped evidence tags
- A small LIVE pill if the news feed last refreshed successfully

Footer always shows:
- “Unofficial personal tracker. Not affiliated with Court TV, any court, or any party. Accused persons are presumed innocent. Sources linked. Do not treat this as legal advice.”

## Data model

### Case
```
{
  id, title, shortName,
  status: "breaking" | "investigation" | "pretrial" | "trial" | "jury" | "verdict" | "sentencing" | "appeal" | "closed",
  court, jurisdiction, judge, defendants[], charges[],
  startDate, nextHearing, lastUpdated,
  summary, whyItMatters,
  tags[],
  sources: [{ label, url }],
  pinned: boolean,
  boardX, boardY, rotation,
  color,
  linkedTo: [caseId],
  userNotesPreview
}
```

### Note
```
{
  id, caseId | null, title, body, color, createdAt, updatedAt, pinnedToBoard
}
```

### Headline
```
{
  id, title, source, url, publishedAt, snippet, relatedCaseIds[]
}
```

Persist cases the user adds or edits, notes, pin positions, links, hidden headlines, and UI prefs in `localStorage`. Ship a seeded starter docket so the board is never empty on first load.

## Seed the board

On first visit, pre-pin 8–12 **current-as-of-September-2026** high-visibility U.S. criminal matters that Court TV / trial-watchers actually follow. Publicly reported facts only. Neutral summaries. Real outbound links. Mix of statuses. Verify names; drop closed matters; add 2–3 live ones from courttv.com/latest-news/. Candidates if still active:

- Lindsay Clancy (MA) — children homicide; mistrial / postpartum-psychosis defense coverage
- Jared Bridegan murder-for-hire matter (FL) — remaining defendants / appeal claims
- Duane “Keffe D” Davis — Tupac Shakur murder conviction / post-trial
- Luigi Mangione — UnitedHealthcare CEO killing; state + federal posture
- Barry Morphew — wife’s death; bond / pretrial issues
- Menendez brothers — parole / post-conviction developments

Each seed case: short pin name, one-paragraph briefing, status chip, court, 2–3 source links, 2–4 tags.

Settings drawer includes **Reset seed data (keep my notes)**.

## BOARD mode

- Cases render as overlapping manila folders / index cards / polaroids.
- Drag to reposition. Persist coordinates.
- Double-click or “Open file” slides out a case dossier: stamped status, facts, user-editable timeline, linked headlines, attached notes, sources, Watch/Pin/Link actions.
- Red string between two user-linked cases. Click a string to remove.
- Right-click / long-press empty cork: “Drop a note here”.
- Unused sticky pads + “new folder” card in the lower-left.

## DOCKET mode

Sortable, filterable list: status, tag, watched-only, Court-TV-tagged, has-upcoming-date.
Columns: case, status, court, next date, last activity.
Quick-add: title, status, court, summary, source URL.
Status chips use teal / red / manila evidence tags, not generic badges.

## WIRE mode

Primary feed: Court TV.

- Fetch `https://www.courttv.com/feed/` through a CORS-friendly public RSS proxy (`https://api.rss2json.com/v1/api.json?rss_url=` and/or AllOrigins).
- If the proxy fails, fall back to a curated static headline pack (10–15 items with real courttv.com URLs) and show “Wire offline — showing last known clippings”.
- Optional secondary feeds the user can enable: CNN Crime and Justice RSS if available, a true-crime/trial Google News RSS query, a custom RSS URL saved in localStorage.
- Newsprint clippings: source stamp, time-ago, headline, 2-line dek, Open source, Pin to case, Hide.
- Fuzzy-match headlines to tracked case names; user confirms the pin.
- Refresh + last-fetched timestamp.
- Headlines + snippet + link only. Do not scrape full article bodies.

## NOTEBOOK mode

Masonry of sticky notes. Title, textarea, color, optional case link, “stick on board”.
Search. Export / import JSON of notes + custom cases.
Never send notes to a server.

## Quality bar

- Keyboard reachable. Esc closes drawers.
- Subtle paper-slide / pin-press motion. No carnival easing.
- In-world empty states (“Nothing pinned. Stamp a new folder.”).
- Toasts look like evidence stickers.
- Offline: shell + local data work; wire uses fallback.
- 60fps drag with ≤20 pins.
- Ink on manila meets WCAG AA.

## What this app is not

- Not a place to post theories as fact.
- Not a tips line, not a public wiki.
- No comments, no social login, no ads.
- No graphic imagery, victim photos, or mugshot galleries as decoration.
- No doxxing fields (addresses, victim family, juror identities).
- Procedural status language before conviction. After a public verdict you may say “convicted of X”.

## Settings

Cork darkness / grain, show/hide strings, reset seed cases, export/import JSON, custom RSS URLs, reduce motion.

## First-run overlay (once)

> This is a private corkboard for trials you’re already watching.
> Pins and notes live in this browser.
> Headlines come from public feeds and always open at the source.
> Accused people are innocent until a court says otherwise.

Button: “Open the board.” Flag in localStorage so it never returns.

## Deliverables

1. A working, beautiful, interactive app — not a mock.
2. Seeded cases that make the board feel alive on first paint.
3. News fetch with a real fallback so the Wire is never a blank error page.
4. Notes that survive refresh.
5. Drag, pin, string, dossier drawer all working.
6. Files that can be committed to `wefeltlikeit-sketch/TrueCrimeStories` and published by Netlify from `main`.

Build the whole thing now. When in doubt, add one more analog detail rather than one more setting.
