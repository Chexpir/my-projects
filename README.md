# my-projects

A collection of small static toy web apps. One folder per project, plain HTML/CSS/JS, no build step, no dependencies.

## Projects

- [`typespeed/`](typespeed/) - type the alphabet a to z as fast as you can, with zero mistakes. Green phosphor CRT style.
- [`kids/`](kids/) - small learning games for a 7-year-old (maths, time, spelling, English), in Spanish. Shared kit in `kids/shared/`, plan in [`kids/PRD.md`](kids/PRD.md).

## Run locally

From the repo root:

```sh
python3 -m http.server
```

Then open <http://localhost:8000>.

## Deploy

Static files only, no build step: GitHub Pages serves the repo straight from `main`.

1. Push the repo to a **public** GitHub repo.
2. Go to Settings -> Pages -> Build and deployment -> Source: **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Every push to `main` redeploys in about a minute. The site is at `https://<user>.github.io/<repo>/`.

`.nojekyll` tells Pages to serve the files as-is (no Jekyll processing).

## Add a new project

1. Create a new folder, e.g. `my-toy/`, with an `index.html` inside.
2. Add a link to it in the root `index.html` (copy the existing `<li>` entry).
3. Commit and push.
