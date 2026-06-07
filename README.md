# SevaGrid Command

Smart Volunteer Deployment & Workforce Optimization for Mahakumbh operations.

[Live Deployment](https://sevagrid-command.vercel.app) | [GitHub Repository](https://github.com/AnuranjanJain/Round2-Experthire)

[Presentation Deck](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-Hackathon-Deck.pptx)

[Presentation Demo Video](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-YouTube-Demo.mp4)

[Premium Showcase Video](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-Premium-Showcase.mp4)

SevaGrid Command is a working Next.js application that helps an operations team allocate volunteers across high-pressure zones using skills, location, workload, incident severity, and scenario pressure. It is built as a stable hackathon demo with deterministic sample data, a premium command UI, and an explainable optimization engine.

## Why This Exists

Mahakumbh-scale volunteer operations need more than a roster spreadsheet. Coordinators must know which zones are under-covered, who can move safely, which skills are missing, and whether the plan is overloading the same people repeatedly.

This project addresses the assigned track by giving commanders a live-feeling deployment workspace for:

- Recruiting-style volunteer profiles with skills, languages, fatigue, availability, and mobility preferences.
- Zone demand modeling across ghats, transit hubs, camps, and command desks.
- Incident-linked skill demand for cases such as crowd pressure, medical support, lost children, language queues, and logistics bottlenecks.
- Explainable assignment recommendations with a score and reason for each deployment.
- Fatigue and rest guardrails so optimization does not simply assign the nearest person every time.

## Product Highlights

- **Scenario simulator:** switch between Balanced, Snan Surge, Heat Alert, and Missing Person modes.
- **Risk-weighted field map:** select zones and inspect coverage, demand, target staffing, and risk.
- **Skill lens:** filter recommended assignments by operational skill.
- **Incident queue:** add new incidents and send response tickets into the assignment plan.
- **Optimization KPIs:** coverage, active volunteers, high-risk zones, open incidents, and fairness.
- **Bench management:** keeps low-fatigue responders visible while protecting resting/training volunteers.
- **Premium responsive UI:** dark/light mode, motion-enhanced state changes, keyboard-visible controls, and mobile-first command flow.

## Optimization Logic

The engine in `src/optimizer.ts` is deterministic and explainable. It calculates:

- Zone demand from base demand, crowd intensity, weather stress, scenario pressure, and incident severity.
- Zone risk from demand, priority, weather stress, and local incidents.
- Target staffing from demand and risk.
- Volunteer fit from skill overlap, incident skill match, language coverage, current zone proximity, mobility preference, fatigue, and shifts already worked.

The resulting plan prioritizes high-risk zones first and returns:

- Per-zone staffing targets and coverage.
- Assignment scores and human-readable reasons.
- Missing skills per zone.
- Bench and protected volunteer lists.
- Coverage, fairness, fatigue, and critical gap metrics.

## Product Architecture

SevaGrid Command is a single-page command-center application built with the Next.js App Router. The current hackathon version is intentionally local-data driven so judges can inspect the allocation model without needing credentials, API keys, or private infrastructure.

- `src/data.ts`: typed volunteer roster, zone map, incidents, and scenario definitions.
- `src/optimizer.ts`: deterministic scoring and deployment planning engine.
- `src/app/page.tsx`: real-time command center surface, map nodes, route visualization, AI dispatch panel, and keyboard controls.
- `src/app/globals.css`: dark command-center design tokens, glass system, map grid, motion, and accessibility styles.
- `next.config.ts`: React strict mode and baseline production security headers.

Runtime flow:

1. Scenario, skill filter, selected zone, and live incident state are managed in the React command surface.
2. The optimizer recalculates deployment targets, assignment scores, missing skills, and fairness metrics from typed local data.
3. Map nodes, AI recommendations, incident queue, and volunteer suggestions all render from the same optimization output, keeping operational data spatially connected to the map.
4. Vercel serves the production build as a static/prerendered Next.js app.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- lucide-react icons
- ESLint
- Vercel

## Run Locally

```powershell
npm install
npm run dev
```

Then open the local URL printed by Next.js.

## Validate

```powershell
npm run check
```

Individual checks:

```powershell
npm run lint
npm run build
npm audit --omit=dev
```

Current validation status:

- ESLint passed.
- Production build passed.
- TypeScript validation passed through `next build`.
- Dependency audit passed with `0 vulnerabilities`.
- Live deployment health check returned `200 OK`.

Current test coverage:

- This version does not yet include automated unit, integration, or end-to-end test suites.
- The project is still testable through deterministic sample data, linting, TypeScript build validation, dependency audit, and manual UI/browser QA.
- Recommended next test additions are listed in [Future Scope](#future-scope).

## Security

Security posture for the current deployment:

- No backend secrets, API keys, database credentials, or user authentication flows are required for the demo.
- No volunteer PII is collected; all roster and incident data is synthetic sample data.
- `npm audit --omit=dev` currently reports `0 vulnerabilities`.
- Production security headers are configured in `next.config.ts`:
  - `Content-Security-Policy`
  - `Referrer-Policy`
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Permissions-Policy`
- Vercel deploys the app over HTTPS.

Security limitations:

- The current Content Security Policy allows inline scripts/styles needed by the Next.js static app. A production system with real user data should move toward stricter nonce-based CSP.
- There is no authentication or role-based access control because this is a public hackathon demo.
- Real Mahakumbh deployment would need audit logs, encrypted storage, user roles, incident data retention rules, and privacy review before handling live volunteer or pilgrim data.

## Deploy

Production deployment:

- [https://sevagrid-command.vercel.app](https://sevagrid-command.vercel.app)

The project is ready for Vercel or any host that supports Next.js static prerendering:

```powershell
npm run build
npm run start
```

For Vercel, import the GitHub repository and keep the default Next.js build settings.

## Demo Flow

1. Start on the SevaGrid Command dashboard and show current coverage and high-risk zones.
2. Switch from Snan Surge to Heat Alert to show how medical and water relief demand changes the plan.
3. Select Sangam Ghat on the field map and review demand, target staffing, assigned volunteers, and required skills.
4. Use the skill lens to filter assignments by Medical Aid or Language Support.
5. Add an incident and show how the incident queue and zone risk update.
6. Mark a ticket as sent and point out the fatigue/fairness guardrails.

## Operator Shortcuts

- `1-6`: select priority-ranked zones on the live map.
- `[` / `]` or arrow keys: cycle operation scenarios.
- `A`: add a new live incident and move focus to the affected sector.
- `T`: collapse or expand the activity timeline.

## Submission Notes

- Project is original for the Round 2 AI-Assisted Product Build Challenge.
- The app is deployable as a Next.js static-rendered app on Vercel, Netlify, or any compatible host.
- No backend, login, or external API key is required for the demo.
- Sample data is intentionally local and transparent so judges can inspect the model behavior.
- Live deployment: [https://sevagrid-command.vercel.app](https://sevagrid-command.vercel.app)
- GitHub repository: [https://github.com/AnuranjanJain/Round2-Experthire](https://github.com/AnuranjanJain/Round2-Experthire)
- Presentation deck: [submission/SevaGrid-Command-Hackathon-Deck.pptx](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-Hackathon-Deck.pptx)
- Presentation demo video: [submission/SevaGrid-Command-YouTube-Demo.mp4](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-YouTube-Demo.mp4)
- Premium showcase video: [submission/SevaGrid-Command-Premium-Showcase.mp4](https://github.com/AnuranjanJain/Round2-Experthire/blob/main/submission/SevaGrid-Command-Premium-Showcase.mp4)

## Future Scope

- Import volunteer signup data from CSV or Google Forms.
- Add GIS coordinates and route-time estimation.
- Push assignments to WhatsApp/SMS dispatch providers.
- Add supervisor acknowledgement and check-in history.
- Train an incident forecast model from historical crowd and weather data.
- Add unit tests for `src/optimizer.ts` to lock assignment scoring, fatigue guardrails, and missing-skill detection.
- Add Playwright end-to-end tests for scenario switching, incident creation, skill filtering, keyboard shortcuts, and responsive command-center layout.
- Add accessibility automation with axe-core and manual screen-reader QA for the map/inspector workflow.
- Add authenticated operator roles for commander, sector lead, dispatch volunteer, and observer.
- Add real-time transport with WebSockets or Server-Sent Events for incident updates and volunteer check-ins.
