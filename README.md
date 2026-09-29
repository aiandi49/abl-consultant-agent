# Abundance Legacy — Consultant Agent

Ms. Lee's consulting tool for relaunching Abundance Legacy's podcast, **Real Choices…Real Life**. It has two pages that share one data file.

- **`guide.html` — the guide.** It covers:
  - All 99 published episodes, sorted into eight YouTube playlists, with the repeats flagged.
  - Downloads by theme.
  - The five-episode pilot, with players.
  - Moving the show to YouTube, rights and credits, money (YouTube, Buzzsprout, the course and giving season), and the plan.
  - The questions to ask the founder.
- **`cheat-sheet.html` — the one-page cheat sheet.** The short version for Ms. Lee: the seven questions for Nate, the pilot five, a daily checklist, all 79 titles sorted into the eight playlists with tick boxes, and the 20 repeats not to upload. It prints cleanly and is linked from the nav on every page and from the consultant's hero.
- **`index.html` — the Consultant Agent.** You start with one open question. It asks a single clarifying question when it needs to, then gives a specific recommendation and a next step for today. The cards beside the chat show:
  - **Top match:** the recommended episode or guide section, with audio for the pilot episodes.
  - **Shortlist:** every match ranked, with a gauge showing the top fit.
  - **Listing details:** the facts and next step for whichever match you tap.

Both pages read `data/gub.json`, and so does the server when it builds the agent's instructions. The agent therefore reasons over exactly what the guide shows.

## What the catalog shows

The 99 published episodes contain 79 distinct titles.

- 7 repeats are exactly the same length as an earlier episode, so they are straight re-airs.
- 10 repeats are exactly 1 min 51 s longer than an earlier episode. They are almost certainly the same recording with a new intro.
- 3 repeats share a title with an earlier episode but differ in length by an irregular amount. Someone needs to listen to them to decide.

Upload one copy of each recording to YouTube.

## Files

```
abl-consultant-agent/
├── index.html        The Consultant Agent
├── guide.html        The guide
├── cheat-sheet.html  One-page cheat sheet (printable)
├── api/chat.js       Serverless function: holds the key, builds the prompt from the guide, calls Claude
├── data/gub.json     THE content: 99 episodes + 22 guide sections (id, title, summary, body, tags, details)
├── css/engine.css    Agent styles (dark indigo engine template)
├── css/guide.css     Guide styles (editorial, Caribbean palette)
├── css/cheat.css     Cheat sheet styles
├── js/controls.js    Theme toggle, text size, phone menu (both pages)
├── js/engine.js      Agent behavior
├── js/guide.js       Guide rendering
├── js/cheat.js       Cheat sheet Print button
├── vercel.json       Function settings and security headers
├── .env.example      Variable names, no values
└── .gitignore
```

There are no dependencies and no build step.

## Putting it online (Vercel)

1. Create a **private** GitHub repository named `abl-consultant-agent` and add these files.
2. In Vercel, import the repository as a new project.
3. In **Settings → Environment Variables**, add `ANTHROPIC_API_KEY` for Production. Use a dedicated key from its own Claude Console workspace.
4. Redeploy. The chat answers only after the key is set and a new deployment has run.

Optional variables:
- `ANTHROPIC_MODEL` overrides the model. The default is `claude-sonnet-5-5`, taken from Anthropic's models page in September 2026.
- `ALLOWED_ORIGINS` adds extra site addresses allowed to call `/api/chat`, such as a custom domain.

To test locally with the Vercel CLI, copy `.env.example` to `.env.local`, fill in the key, then run:

```
vercel dev
```

The guide loads `data/gub.json`, so it needs to be served from a web server. Opening the file straight from your computer shows a note explaining this instead.

## Editing the content

Everything lives in `data/gub.json`:

- **Episodes** have `kind: "episode"`, plus a playlist, date, length, guest, link, `repeatOf` (for re-airs) and `audio` (for the pilot files).
- **Guide sections** have `kind: "guide"` and a `section` (`start`, `youtube`, `rights`, `money` or `plan`).

Change a playlist, fix a summary or add a direct Buzzsprout link, and the guide and the agent pick it up on the next deployment. The cheat sheet is plain HTML, so if a playlist or title changes in `data/gub.json`, update `cheat-sheet.html` to match. Only 25 episodes have a confirmed direct Buzzsprout link (`urlConfirmed: true`). The rest link to the show page until someone copies their links from the RSS feed.

## Downloads

`downloads/abl-podcast-workbook.xlsx` is an Excel workbook for Ms. Lee with four sheets:

- **Summary:** counts by playlist and duplicate type, all as live formulas.
- **All 99 episodes:** every episode, with duplicates in red, which episode each one repeats, and how it differs.
- **30-day plan:** change the yellow start date and every date updates.
- **YouTube videos (fill in):** paste the channel's videos and it finds the matching episode and flags repeats.

It's linked from the cheat sheet, and the consultant gives the link whenever someone asks for a list, a spreadsheet or a plan. If episodes change in `data/gub.json`, rebuild the workbook to match.

## What is real, and what would need a bigger build

**Works now:**
- The guide.
- Filtering and search across all 99 episodes.
- The pilot audio players.
- The live consultant chat, once the key is set.
- Drafts with a copy button.
- Cards that keep the last matches while the agent asks a follow-up question.
- Theme and text size choices, which are remembered on this device.

**Would need a bigger build:**
- Posting to YouTube or Instagram.
- Editing playlists.
- Reading YouTube or Buzzsprout analytics.
- Sending email.
- Accounts or history saved across devices.

The agent says so plainly when asked to do any of these.

## Security

- **Key handling.** The key is read only on the server, with `process.env` in `api/chat.js`. Browser code only ever calls `/api/chat`.
- **What the server controls.** The server alone sets the model, token limit and system prompt. Anything else in the request is ignored.
- **What `/api/chat` accepts.** It takes POST only, and only JSON. Bodies must be 32 KB or less, with at most 30 messages of up to 4,000 characters each. Only user and assistant turns are forwarded.
- **Origin check.** Requests whose `Origin` isn't this site are refused with 403. This blocks other websites. It does **not** block scripts, which can fake the header, so it doesn't replace the rate-limit rule or the spend cap.
- **Built-in rate limit.** It allows 20 requests per visitor per 10 minutes, then returns 429. It counts per server instance, so it is best-effort. Add the Vercel Firewall rule below as the real limit.
- **Upstream calls.** Answers stream to the browser as they're written, so long answers aren't cut off by phones or networks, and there's a quiet keep-alive while Claude is thinking. If Claude is busy (429/5xx/529), the server retries once before giving up. Calls time out after 280 seconds, inside the function's 300-second limit.
- **Errors.** Errors return a plain `{error}` message. The logs record status codes only, never message text, headers or keys.
- **Safe display.** All model and user text is placed with `textContent`. There are no `innerHTML`-style calls, `eval` or inline event handlers.
- **Headers.** `vercel.json` sets the full header set on every route. The Content Security Policy allows only this site and Google Fonts. It allows one exception for audio: ABL's Supabase storage, which plays the pilot episodes. The small theme script in each page's `<head>` is allowed by its sha256 hash. If you edit that script, recompute the hash and update `vercel.json`.
- **Prompt safety.** The system prompt holds nothing private. It tells the model that guide content and user text are data, not instructions.
- **Private data.** Guests' personal emails and phone numbers from the old production schedule are **not** in this repository and must never be added.

## You must do this by hand

- [ ] **Vercel:** add `ANTHROPIC_API_KEY` under Settings → Environment Variables (Production), then redeploy.
- [ ] **Claude Console:** create a workspace just for this project. Set a monthly spend limit and spend alerts there. Give Preview/Development a separate low-limit key, or none.
- [ ] **Vercel Firewall:** add a rate-limit rule on the path `/api/chat`, for example 20 requests per 10 minutes per IP. Vercel's docs (September 2026) say WAF rate limiting is available on all plans, and Hobby projects get up to 3 custom rules.
- [ ] **GitHub:** confirm the repository is private. Turn on secret scanning and push protection under Settings → Code security.
- [ ] **Keys:** if a key was ever pasted into a chat, a file or a commit, revoke it in the Claude Console and create a new one.
