# Resident Detective

A web app that writes an original, printable "whodunit" mystery session for a group of residents — a character sheet per resident, a facilitator's script, and clue cards, all generated fresh by Claude and ready to print. No installs, no accounts, no screens for residents.

This is the working app for LCS Collaboration Technology's **Resident Detective** project (InnoTank 2026 Top 5 finalist). It's a first playable version, built to match the design language and product spec from the informational site and pitch materials.

## Running it

No build step, no server-side code required for the app itself.

```
python3 -m http.server 4700
```

Then open `http://localhost:4700` in a browser. (Opening `index.html` directly by double-clicking also works in most browsers, since all calls go straight to Anthropic's API from the page.)

## Getting set up

1. Open the app. On first load it will prompt for an **Anthropic API key**.
2. Get a key at [console.anthropic.com](https://console.anthropic.com/settings/keys) if you don't have one.
3. Paste it into Settings and hit Save. It's stored only in that browser's `localStorage` — never sent anywhere except Anthropic's API.
4. The default model is `claude-sonnet-5`. Change it in Settings if needed.

**Note on the API key model:** this first version calls the Claude API directly from the browser (using Anthropic's `anthropic-dangerous-direct-browser-access` header, intended for prototyping). That means whoever opens the app needs their own key pasted into Settings. This is fine for an internal staff prototype but is **not** meant for a public-facing deployment — a real rollout should move the API call behind a small backend that holds the key server-side (see Roadmap below).

## How a session gets made

1. Staff pick an **event type** (Resident Mystery Session, Dinner Party, Themed Community Event, Family Visit, Staff Team Building, Holiday Party) and a **theme** (eight built-ins, or a custom theme in plain text), plus optional **seasonal tie-in** and **tone**.
2. Build the **cast roster** — each participant gets a name, an optional character-notes box (profession, hobbies, personality — woven into their character), and a participation level (**Full player / Light role / Observer**). Typing a comma-separated list into a name field fans out into rows automatically.
3. Set **session length** (20 min – 2 hours), **cognitive level**, **mobility**, and **roleplay intensity** — these all steer what Claude writes, not just cosmetic labels. A free-text "anything else" box passes special requests straight to the writer.
4. Hit **Generate the Mystery**. Claude returns a structured mystery (forced via tool-use/JSON schema, not free text) covering:
   - Title, case number, era, setting, hook, victim
   - One character per resident: backstory, what they know, their secret, clues they hold, conversation starters
   - A staff-only facilitator guide: opening briefing, scene-by-scene script, discussion prompts, closing reveal, full solution
   - Printable clue/evidence cards
5. Staff review on the **Overview / Character Sheets / Facilitator Guide / Clue Cards** tabs, then print each section (or the whole packet) with print buttons that build a dedicated print layout — one page per character sheet, culprit flag hidden from the printed copy (it's a staff-only on-screen indicator).

## Prompt Studio (admin)

`admin.html` is the administrative side of the app — it edits the **prompt templates** that drive every generation. The system and user templates use `{{placeholder}}` variables (documented on the page with click-to-copy chips); staff-facing form values are injected at generation time. Custom templates are saved to the browser's localStorage and picked up by the main app on the very next generation; **Reset to Defaults** restores the built-ins. The page also sketches the planned multi-agent review pipeline (Continuity Reviewer, Resident-Fit Reviewer, Print Formatter) — each will get its own prompt slot there when built.

## Project files

```
index.html    Main app shell + Settings modal markup
admin.html    Prompt Studio — edit the generation prompt templates
styles.css    Design system (matches the InnoTank landing page's navy/blue/green palette) + print layout
app.js        Main app: state, roster, the Claude API call, rendering, and print logic
admin.js      Prompt Studio: template editing, placeholder chips, live preview
prompts.js    Shared option catalog (event types, themes, tones…) + template engine — loaded by both pages
assets/       Brand logo + favicon mark
```

## Roadmap / known limitations (first version)

- **API key handling** — move to a small backend proxy before any wider or public rollout, so staff never handle a raw API key.
- **No save/history** — a generated mystery lives only in memory; refreshing the page loses it. Worth adding local history or export-to-PDF next.
- **No PDF export** — printing relies on the browser's print-to-PDF, not a dedicated PDF pipeline.
- **No auth/multi-user** — this is a single-browser prototype, not tied into LCS's Microsoft environment yet (mentioned as a target in the pitch materials).
- Large print mode adjusts on-screen/print font size and asks Claude for shorter sentences, but doesn't yet change layout density.
