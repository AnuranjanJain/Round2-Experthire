# SevaGrid Command

Smart Volunteer Deployment & Workforce Optimization for Mahakumbh operations.

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

- `src/data.ts`: typed volunteer roster, zone map, incidents, and scenario definitions.
- `src/optimizer.ts`: deterministic scoring and deployment planning engine.
- `src/app/page.tsx`: real-time command center surface, map nodes, route visualization, AI dispatch panel, and keyboard controls.
- `src/app/globals.css`: dark command-center design tokens, glass system, map grid, motion, and accessibility styles.

## Tech Stack

- React 19
- Next.js 16
- TypeScript
- Tailwind CSS 4
- Framer Motion
- lucide-react icons

## Run Locally

```powershell
npm install
npm run dev
```

Then open the local URL printed by Next.js.

## Validate

```powershell
npm run lint
npm run build
```

## Deploy

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

## Future Scope

- Import volunteer signup data from CSV or Google Forms.
- Add GIS coordinates and route-time estimation.
- Push assignments to WhatsApp/SMS dispatch providers.
- Add supervisor acknowledgement and check-in history.
- Train an incident forecast model from historical crowd and weather data.
