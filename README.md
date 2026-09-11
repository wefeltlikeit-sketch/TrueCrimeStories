# THE BOARD

Personal corkboard for current true-crime cases, Court TV headlines, and private notes.

Site target: Netlify, built from this repo  
Repo: [wefeltlikeit-sketch/TrueCrimeStories](https://github.com/wefeltlikeit-sketch/TrueCrimeStories)

This is an unofficial personal tracker. It is not affiliated with Court TV, any court, or any party. Accused persons are presumed innocent. Do not treat anything here as legal advice.

## What it is

- **Board** — pin cases on a cork wall, drag them, connect them with red string
- **Docket** — filterable list of tracked matters
- **Wire** — Court TV / trial news clippings (RSS + fallback pack)
- **Notebook** — private sticky notes stored in the browser (`localStorage`)

Notes never leave the visitor’s browser. There is no account system in v1.

## Netlify

1. In Netlify: **Add new site → Import an existing project → GitHub**
2. Choose `wefeltlikeit-sketch/TrueCrimeStories`
3. Settings for the current static scaffold:
   - Build command: *(leave empty)*
   - Publish directory: `.`
4. After Grok Build (or you) add a bundler such as Vite, switch to:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Every push to `main` deploys.

`netlify.toml` already publishes the repo root so a first deploy works before the app exists.

## Local

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Working with Grok Build

1. Paste the prompt in `docs/GROK-BUILD-PROMPT.md` into Grok **Build** mode.
2. When the preview looks right, export the source.
3. Replace the placeholder `index.html` (and add `src/`, `package.json`, etc. if the export is a bundled app).
4. Commit to `main`. Netlify picks it up.

Do not commit API keys. v1 must run without keys.

## Repo layout (now)

```
index.html                 placeholder holding page
netlify.toml               publish root, SPA fallback
docs/GROK-BUILD-PROMPT.md  full product spec for Grok Build
```
