# Tantiya clickable mockup

A clickable mockup of the whole Tantiya app flow, built for the Dec 1, 2026 review with the startup creator. It is a mockup only: no backend, mock data, English only, dark theme.

- **User app** in a phone frame: sign-up to approval, markets and betting (American lines, side bets, line moved, result breakdown), Community, wallet (simulated top-up and withdraw), safer play, leaderboard and analytics.
- **Staff console** in a desktop frame: KYC review (from Task 10), lines and exposure with pause, market builder, resolution queue, moderation queue, withdrawal approvals.
- **Decisions board**: every open question the mockup raises.
- The phone and the staff console share one set of sample data in memory, so a staff action (pause, settle, approve) shows up on the phone. **Reset demo** restores it.

All numbers, names, dates and lines are sample values. Coins are play money: "Simulation — no money is charged."

## Run it

No install needed. Open `dist/index.html` in a browser (it works offline: fonts, styles and scripts are inlined).

To rebuild after editing `src/`:

```sh
node build.mjs   # Node 18+, no dependencies
```

Deep links: `#start`, `#flow-1` … `#flow-7`, `#staff`, `#decisions`.

## Layout

```
build.mjs          inlines src/ into dist/index.html
src/index.html     page template
src/styles.css     tokens and components (Tantiya tokens: ink navy, teal, blue/orange outcomes, IBM Plex Sans)
src/fonts/         IBM Plex Sans (SIL Open Font License, see OFL.txt)
src/js/core.js     helpers, icons, odds maths (American / decimal / implied %)
src/js/data.js     sample markets, side bets, bets, posts
src/js/state.js    demo state and actions shared by both frames
src/js/*.js        one file per area: markets, betting, community, signup, wallet, safer, account, staff, decisions
src/js/flows.js    flow map for the start screen and the presenter rail
src/js/shell.js    frames, navigation, rendering, events
docs/PLAN.md       flow map, screen list and the decisions behind this mockup
dist/index.html    the built page (committed so it can be opened or hosted without building)
```

Each screen registers an id (for example `2.05`), a title, a tag (reused / changed / new) and notes. The presenter panel beside the phone shows them, with anything not in the proposal marked "My choice, needs confirmation."

## Hosting and moving the repo

The repo has no secrets, environment files, or account-specific settings, so it moves as is:

- **Move to the new GitHub account:** GitHub → Settings → Transfer ownership, or `git remote set-url origin <new-url> && git push --mirror`.
- **Host:** any static host serves `dist/index.html` (Vercel, Netlify, GitHub Pages on a public repo or a paid plan). Review links during the sprint are published as a private claude.ai artifact.
