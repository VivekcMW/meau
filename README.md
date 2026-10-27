# AllUnite One

A browser-only prototype connecting outdoor, digital outdoor and programmatic outdoor workflows in one workspace. Built with React, TypeScript and Vite; no backend, application API, external AI, analytics or live payment integrations.

## Run

Use Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Hash-based routes work without server-side routing rules. Serve over HTTPS, or localhost for development; creative storage and clipboard features require browser support and permissions. Opening the HTML directly with `file://` is not supported.

## Explore the connected workflows

- **Direct campaign:** Overview -> Planner -> choose a plan -> follow the next-action banner. The banner guides budget approval, both media owners' offers and signatures, creative review, launch, simulated delivery, posting proof, reconciliation, invoice and payment.
- **Direct deals (buyer direct):** Direct deals -> Start a direct deal, or open a planned campaign's **Negotiate in Direct deals** link. Follow the banner between the buyer and each media owner until insertion orders are signed.
- **Self-serve:** All apps -> Marketplace. Pick available locations, review the booking and confirm a clearly labelled simulated payment. No money moves.
- **Programmatic guaranteed:** SSP -> Create guaranteed deal -> continue as the trader -> accept -> review creative -> launch.
- **Field proof:** Booked static faces become field jobs automatically. Simulated GPS distance must be within 50 metres and the proof timestamp must fall inside the booking window. Completed proof appears in the buyer report.
- **Finance exception:** Finance -> Review exceptions. The seeded discrepancy demonstrates four-way comparison, evidence-based credit and reconciliation.
- **Audience planning:** Audience studio -> choose or create a segment -> Turn this into a plan. Its market and environment drive the planner's inventory selection.

Use the avatar to preview 15 personas and two media-owner contexts. All apps exposes the connected modules without crowding each persona's navigation. Workflow policies in Admin are editable and enforced locally.

## Everyday workspace

- **Overview** starts with actions assigned to the current role, recent recorded activity and campaign delivery. Task counts use the same role, media-owner and market filters in Overview, navigation, My tasks and the guided assistant.
- Page titles name the actual tool. Planner compares real fixture locations rather than decorative map pins; summary cards show totals without invented trend sparklines.
- Planning actions stay in the current role. Other roles see their tasks; business owners start from Marketplace. The All apps directory explains each tool and names the role before a demo role switch.
- The header and footer remain visible while the main workspace scrolls. The same layout is used on the architecture page; the footer does not cover content. Dialogs remain above the workspace and notification toasts sit above the footer.
- Use the sidebar's **Collapse sidebar / Expand sidebar** control for an icon-only workspace with labelled tooltips. More tools, role switching and Help stay available; mobile keeps its full-label navigation drawer. Selected navigation uses a soft background without a left-side stroke.
- Counts and delivered audience on Overview cover the full demo flights. No artificial weekly/monthly multiplier is applied.

## Direct deals

Direct deals is the buyer-direct desk. An agency or brand negotiates directly with media owners in one shared record. Nobody sends emails or spreadsheets back and forth.

- **Start in three choices:** market, budget and goal. Places, the buyer's agreement rates, soft holds and one RFP per media owner are prepared automatically. Budgets above the approval limit go to the budget approver first. Brands can buy directly without an agency.
- **Owner proposals:** Owner sales sees an inbox of RFPs. **Send proposal** is pre-filled with the agreement rate or the matching volume tier, and owners can suggest better-value alternative places.
- **Negotiate:** The buyer can **Accept**, **Counter** (pre-filled 3 points above the offer) or **Swap** in an owner's suggested place. Owners can **Accept** or **Meet halfway**. Each move updates the price, the savings against rate card and the per-owner history.
- **Soft holds and option ranks:** Every offer shows the hold expiry and whether the buyer holds 1st or 2nd option. Buyers can **Ask for 48h more**; owners can **Extend hold 48h**.
- **Insertion orders:** Once every owner accepts, insertion orders are generated. Each side signs its demo copy and the deal is booked. It then continues through the normal creative, launch, proof and settlement workflow.
- **Routes everywhere:** Planner options show the best buying mix, for example "2 direct · 3 marketplace · 1 programmatic". The campaign plan shows a **Best route** column for each place.
- Budget approvers can read deals but cannot change them. The layout adapts to the space available, so it stays usable next to the tour guide or assistant.

Agreement rates, holds and IOs are simulated with demo data. Nothing is sent to a media owner and no contract is created.

## Guided first visit

The first visit to **Overview** offers two optional paths: **By my role** (15 personas) or **By an app** (18 tools). A preview explains the selected role, the demo identity and the short walkthrough before anything starts. App tours retain your current role when it has access; otherwise the preview names the role it will switch to.

- Role tours connect assigned work, relevant apps and the next responsible person. App tours explain three concrete parts of a tool.
- The guide sits alongside the workspace on desktop and below it on smaller screens. The highlighted section stays in the scrolling workspace; the footer never overlaps it.
- Use **Back**, **Next**, **Pause** or **Finish tour**. Pausing lets you explore freely; **Help** offers resume, replay and a different role/app. Refreshing the same tour route resumes the saved step. Unrelated navigation or persona changes pause the guide instead of redirecting you.
- Completion offers the relevant workspace and, when permitted and available in the selected market, a visible example campaign.
- **Explore without a tour** dismisses the first-visit prompt. Campaign, app, architecture and share deep links are never interrupted by a first-visit chooser.
- Starting a tour can change only the explicitly previewed demo persona. Tour navigation never creates campaigns, approves, signs, books, launches or settles anything. Actions you take in the workspace still work normally.

Tour progress is validated separately under `allunite-one.onboarding.v1` in `localStorage`. Workspace reset does not erase the tour; replay it from Help, or clear this site's storage to restore first-visit behavior. Unreadable or unavailable storage produces an explicit warning; if saving fails, the tour can continue in the current tab without claiming that progress was saved.

## Platform architecture explorer

Use **Architecture** in the navbar, or open `/#/architecture` directly, for an independent audience-facing explanation of the platform.

- Start with the interactive **ecosystem map**: five areas surround the shared campaign and audience core. Each area reveals its key people, connected apps, incoming context and shared output. Digital screens, static billboards, transit and retail keep the physical world visible.
- Area selections also highlight the detailed app/persona atlas and workflow steps. Follow the audience-to-results feedback loop, open a connected app/persona explanation, or choose **Follow the handoffs**. The map is inside the existing application; there is no separate design file or service.
- Choose a persona to highlight their connected apps, role-aligned features and workflow steps.
- Choose an app to highlight the people who use it, its primary owners and the connected handoffs.
- Trace eight journeys: direct, self-serve, guaranteed deals, static posting, reconciliation, brand buys direct, audience-to-outcomes, and platform assurance.
- Inspect the seven conceptual architecture layers, shared objects, market configuration and simulated integration boundary.
- **Show full platform** or the map's central core clears the selection. Query links such as `/#/architecture?area=supply`, `/#/architecture?persona=crew` and `/#/architecture?app=finance` preserve selections on refresh.
- On smaller screens, selections bring their explanation into view; the sticky Map / People / Apps / Details / Workflows navigation keeps each part within reach.

The navbar carries the current app into the explorer and offers a return to the original workspace route. Exploring never changes the saved persona or campaign data. **Open app in workspace** uses the existing persona and route guards; architecture visibility is explanatory, not a new permission grant. The 18-app count excludes the shared Overview and My tasks surfaces.

Ecosystem areas group the work, not access rights; people can contribute across areas. Handoffs and the results-to-planning loop are conceptual explanations using demo data, not live integrations or automatic optimisation.

## Architecture

- [`src/domain/model.ts`](src/domain/model.ts): shared entity types and persisted-state schemas.
- [`src/domain/config.ts`](src/domain/config.ts): market packs, persona templates and formatting.
- [`src/domain/fixtures.ts`](src/domain/fixtures.ts): deterministic synthetic inventory and campaign scenarios.
- [`src/domain/engine.ts`](src/domain/engine.ts): pure workflow transitions, role checks, availability, planning, delivery and financial calculations.
- [`src/domain/store.ts`](src/domain/store.ts): shared Zustand workspace, validated persistence and notifications.
- [`src/domain/architecture.ts`](src/domain/architecture.ts): typed persona/app feature mappings and presentation workflows, with access derived from the existing persona configuration.
- [`src/domain/tours.ts`](src/domain/tours.ts): role/app walkthroughs, entitlement-aware demo identity and validated progress.
- [`src/components/`](src/components/): reusable shell, dialogs, controls, maps, charts and illustrative creative.
- [`src/pages/`](src/pages/): lazy-loaded modules using the same domain state and actions.

Budgets and financial values use integer minor currency units. Different currencies are not summed together. Audience forecasts account for booking duration and digital share of voice. Missing static proof contributes no delivered audience. Over-delivery is not billed and cannot offset another location's under-delivery.

## Persistence and reset

Workspace changes persist in `localStorage` under `allunite-one.workspace.v1`. Uploaded PNG/JPEG/WebP creative stays in the browser's `allunite-assets` IndexedDB database. Images must be at least 320 x 180 pixels and no larger than 5 MB.

Admin -> Reset demo restores the starter workspace after confirmation. Uploaded binaries remain in IndexedDB; clear this site's browser storage to remove them too. Storage failures surface an error instead of claiming success. Invalid saved state surfaces a recovery warning.

The share view is read-only but **local to the browser containing the campaign**. It is not an externally hosted or secure sharing service.

## Validation

```sh
npm test
npm run lint
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

The Playwright suite starts and stops its own production-preview server on port 4173. Keep that port free. Tests use isolated browser contexts and do not change the workspace in your normal browser.

Tests cover workflow handoffs, financial/proof boundaries, persistence, role previews, all module routes, page-overflow checks at 1440/768/390/320 CSS pixels, and automated WCAG AA checks on representative views. Browser projects target Chromium, Firefox and WebKit. These checks are not a complete accessibility certification or a guarantee for every browser version/device. HTML reports are written to `playwright-report/`.

## Prototype boundaries

- All audiences, inventory, delivery, attribution and financial records are synthetic. Six starter markets contain 300 frames; the architecture is global, not a claim of live worldwide supply.
- The assistant uses deterministic local workflows, not a language model. Autonomy controls support off, answers and human-reviewed drafts.
- Persona switching and visibility are UX demonstrations, not authentication or secure tenant isolation.
- English interface copy; market-specific currency/date formatting. Full translations are not implemented.
- Market/persona configuration panels preview templates. Inventory includes a blackout control, but not a production price-book editor or complete digital capacity/auction engine.
- Schedules, field routing, proof imagery, content compliance and integrations are illustrative or human-confirmed. There is no GPS collection, image recognition, CMS, OpenRTB traffic or live sensor data.
- Invoices are consolidated **demo statements**, not legally valid issuer-specific e-invoices. Tax rates and payment methods are illustrative.
- The static assets must be served locally or by a static host. There is no offline service worker.

## Visual assets

The interface follows AllUnite's forest green (`#1A4B3F`) and coral (`#D2595C`). Poppins is the primary font for headings, navigation and actions; Roboto is the secondary font for body copy, inputs, tables and numerical data. Both are bundled locally. Dark green body text, darker coral text accents and distinct control borders improve contrast without changing the brand palette. Campaign artwork and city scenes are illustrative CSS/vector assets, not real inventory photographs.

Fonts are bundled through `@fontsource/poppins` and `@fontsource/roboto`; their license files are included in the packages. World geography uses `world-atlas` / public-domain Natural Earth data, rendered with TopoJSON and D3 Geo. No external map tiles, font CDN or image service is required at runtime.
