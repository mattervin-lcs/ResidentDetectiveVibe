# Resident Detective — Informational Site

A single-page informational website explaining the Resident Detective application.
Built as static HTML/CSS/JS — no build step, no dependencies.

## Repository layout

```
index.html                              ← the entire site
assets/
  logo.png                              ← transparent-background logo (nav + footer)
  logo-mark.png                         ← circular mark (favicon)
  video-poster.jpg                      ← poster frame shown before video plays
  resident-detective-overview.mp4       ← ⚠️ YOU ADD THIS — see below
README.md
```

## ⚠️ Add the overview video

Drop your video file into the `assets/` folder named **exactly**:

```
assets/resident-detective-overview.mp4
```

Notes:
- Use MP4 with H.264 video + AAC audio for maximum browser compatibility.
- GitHub blocks files over 100 MB. If the video is larger, compress it
  (HandBrake "Web Optimized" preset works well) or use Git LFS.
- If the file is missing, the site shows a friendly "video not found" panel
  instead of a broken player.

## Deploy on GitHub Pages

1. Push this folder's contents to the repository root (or a `/docs` folder).
2. Repo → **Settings → Pages** → Source: *Deploy from a branch* →
   select branch `main`, folder `/ (root)` (or `/docs`).
3. Site goes live at `https://<org>.github.io/<repo>/` within a minute or two.

## Interactive features (all client-side, no backend)

- Scroll progress bar + scrollspy nav highlighting
- Mouse spotlight + 3D-tilt app preview + typewriter case hook (hero)
- Count-up statistics on scroll
- Auto-advancing "How It Works" steps with per-tab progress (pauses on hover)
- "Cast your own group" demo — type real first names, switch themes, shuffle stories
- Flip cards, FAQ accordion, HTML5 video with custom play overlay + fullscreen
- `prefers-reduced-motion` respected throughout
