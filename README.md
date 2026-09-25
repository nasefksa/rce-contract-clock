# ⏱️ RCE Contract Clock

> Timing-intelligence engine for the **Construction Reality Contract Engine (RCE)**.
> Turns a contract's configured notification windows into a live
> **green / amber / red / expired** priority signal for every site event.

[![CI](https://github.com/YOUR_ORG/rce-contract-clock/actions/workflows/ci.yml/badge.svg)](../../actions)
![Node](https://img.shields.io/badge/node-%3E%3D18-3c873a)
![Status](https://img.shields.io/badge/stage-prototype-1E6091)
![Type](https://img.shields.io/badge/output-prioritisation%20only-C0801B)

---

## Contents

1. [What it is](#what-it-is)
2. [Why it matters](#why-it-matters)
3. [How it works](#how-it-works)
4. [Install](#install)
5. [Quick start](#quick-start)
6. [API reference](#api-reference)
7. [The NEC4 default profile](#the-nec4-default-profile)
8. [Configuring other contracts (JCT / FIDIC / bespoke)](#configuring-other-contracts)
9. [Integrating into the platform](#integrating-into-the-platform)
10. [Testing & demo](#testing--demo)
11. [Project structure](#project-structure)
12. [Roadmap](#roadmap)
13. [Important boundary](#important-boundary)
14. [License](#license)

---

## What it is

Construction events often become commercially significant **before** anyone has
connected the site facts to the contract. On NEC contracts that gap is dangerous
because notification windows are time-barred: recognise an event too late and the
route to a compensation event can close.

The **Contract Clock** answers one operational question for every logged event:

> **Should this be reviewed now?**

Given when the organisation became *aware* of an occurrence and which event class
it belongs to, the engine finds the governing contract mechanism (for example the
NEC4 8-week awareness bar in clause 61.3), computes the deadline and days
remaining, and returns a colour-coded status with a plain-language rationale.

## How it works

The engine maps *days remaining* in the configured window onto a status:

| Status | Meaning | Default trigger |
| :---: | --- | --- |
| 🟢 `green` | On clock | more than `amberWithinDays` (21) remain |
| 🟡 `amber` | Time-sensitive | `amberWithinDays` (21) or fewer remain |
| 🔴 `red` | Act now | `redWithinDays` (7) or fewer remain |
| ⚫ `expired` | Window passed | the deadline is in the past |
| ⚪ `unknown` | Insufficient information | no awareness date, or no mechanism configured |

```
deadline      = awarenessDate + mechanism.windowDays
daysRemaining = deadline − now            (whole UTC days)
status        = colour band of daysRemaining, or 'expired' if negative
```

Thresholds and windows are configuration, not hard-coded rules.

## Install

Requires Node 18+.

```bash
npm install          # install dev dependencies
npm test             # run the test suite
npm run demo         # print statuses for sample events
npm run build        # emit dist/ (ESM + .d.ts)
```

## Quick start

```ts
import { assessContractClock } from '@rce/contract-clock';

const result = assessContractClock({
  id: 'EVT-0342',
  eventClass: 'late_information',
  awarenessDate: '2026-01-20',
});

// {
//   status: 'amber',
//   daysRemaining: 16,
//   deadline: '2026-03-17',
//   clause: 'NEC4 cl. 61.3',
//   mechanism: 'Contractor notification — 8-week awareness bar',
//   rationale: '16 day(s) left within the NEC4 cl. 61.3 window. Becoming time-sensitive.',
//   isDetermination: false,
//   disclaimer: 'Operational prioritisation only. Not legal advice ...'
// }
```

## API reference

### `assessContractClock(seco, profile?, now?)`

| Parameter | Type | Default | Notes |
| --- | --- | --- | --- |
| `seco` | `Seco` | — | The event (see below) |
| `profile` | `ContractProfile` | `NEC4_PROFILE` | Windows, thresholds, clause mapping |
| `now` | `Date` | `new Date()` | Assessment date — **inject for reproducible results** |

**Input — `Seco`** (only the fields the clock uses):

```ts
interface Seco {
  id: string;
  eventClass:
    | 'late_information'
    | 'access_obstruction'
    | 'unforeseen_physical_conditions'
    | 'client_designer_instruction'
    | 'predecessor_caused_rework';
  awarenessDate?: string;   // ISO — when the org became aware
  mechanismId?: string;     // optional: override the mechanism for this event
}
```

**Output — `ClockResult`:**

```ts
interface ClockResult {
  status: 'green' | 'amber' | 'red' | 'expired' | 'unknown';
  daysRemaining: number | null;
  deadline: string | null;   // ISO date
  clause: string | null;     // e.g. 'NEC4 cl. 61.3'
  mechanism: string | null;
  windowDays: number | null;
  rationale: string;         // plain-language explanation
  isDetermination: false;    // always false, by design
  disclaimer: string;
}
```

Also exported: `CLOCK_STATUS_LABELS`, `CLOCK_DISCLAIMER`, and the profile types
`ContractProfile`, `ClockMechanism`, `ClockThresholds`, plus `NEC4_PROFILE`.

## The NEC4 default profile

`NEC4_PROFILE` ships as a sensible starting point (all values configurable):

| Event class | Clause | Window |
| --- | --- | :---: |
| Late information | NEC4 cl. 61.3 | 56 days (8 weeks) |
| Access obstruction | NEC4 cl. 60.1(5) | 56 days |
| Unforeseen physical conditions | NEC4 cl. 60.1(12) | 56 days¹ |
| Client / designer instruction | NEC4 cl. 60.1(1) | 56 days |
| Predecessor-caused rework | NEC4 cl. 61.3 | 56 days |

Thresholds: `redWithinDays: 7`, `amberWithinDays: 21`.

¹ Physical conditions should be actioned without delay; the 8-week bar still
governs notification. The engine carries this as an operational note.

## Configuring other contracts

The 8-week bar is not baked in. Pass a custom `ContractProfile` for JCT, FIDIC or
bespoke forms (business plan §23.2):

```ts
import { assessContractClock, type ContractProfile } from '@rce/contract-clock';

const bespoke: ContractProfile = {
  name: 'Bespoke — 28-day notice',
  thresholds: { redWithinDays: 5, amberWithinDays: 14 },
  byClass: {
    late_information: 'notice_28',
    access_obstruction: 'notice_28',
    unforeseen_physical_conditions: 'notice_28',
    client_designer_instruction: 'notice_28',
    predecessor_caused_rework: 'notice_28',
  },
  mechanisms: {
    notice_28: { id: 'notice_28', clause: 'Cl. 14.2', label: '28-day notice', windowDays: 28 },
  },
};

assessContractClock(seco, bespoke);
```

## Integrating into the platform

The engine is pure and side-effect free, so it drops into an API, a worker, or
the UI directly:

```ts
// e.g. sort a project's events by urgency for the dashboard
const ranked = events
  .map((e) => ({ event: e, clock: assessContractClock(e) }))
  .sort((a, b) => rank(a.clock.status) - rank(b.clock.status));

function rank(s: string) {
  return { red: 0, amber: 1, expired: 2, green: 3, unknown: 4 }[s] ?? 5;
}
```

## Testing & demo

```bash
npm test        # 8 unit tests (vitest) covering every status + overrides
npm run demo    # deterministic output across green/amber/expired/unknown
```

Tests inject a fixed `now`, so results never depend on the wall clock.

## Project structure

```
src/
  index.ts           public exports
  types.ts           SECO model + event classes
  dates.ts           UTC day maths
  contractClock.ts   the engine
  nec4Profile.ts     default NEC4 windows + thresholds
tests/               vitest suite
examples/            runnable demo + sample SECOs
.github/workflows/   CI (typecheck → test → build)
```

## Roadmap

- Additional profiles: JCT, FIDIC (business plan §14.3, §23.2)
- Reply-period / quotation sub-clocks (not just the awareness bar)
- Per-project working-day calendars (exclude non-working days)
- Optional escalation hooks (notify a reviewer on amber → red)

## Important boundary

This engine produces an **operational prioritisation signal only**. It does
**not** determine contractual entitlement and is **not** legal advice. Every
output is intended to prompt timely professional review, and the default clause
windows should be confirmed against the specific contract by a qualified
quantity surveyor or contracts specialist before commercial use.

## License

© 2026 RCE. Proprietary — see [LICENSE](LICENSE).
