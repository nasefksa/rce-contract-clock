/**
 * Runnable demo:  npm run demo
 * Runs the Contract Clock over sample SECOs against a fixed assessment date.
 */
import {
  assessContractClock,
  CLOCK_STATUS_LABELS,
  EVENT_CLASS_LABELS,
  type Seco,
} from '../src/index.js';

const NOW = new Date('2026-03-01T12:00:00Z');

const samples: Seco[] = [
  { id: 'EVT-0356', eventClass: 'unforeseen_physical_conditions', awarenessDate: '2026-02-28' },
  { id: 'EVT-0342', eventClass: 'late_information', awarenessDate: '2026-01-20' },
  { id: 'EVT-0331', eventClass: 'access_obstruction', awarenessDate: '2026-01-14' },
  { id: 'EVT-0298', eventClass: 'predecessor_caused_rework', awarenessDate: '2025-12-15' },
  { id: 'EVT-0360', eventClass: 'client_designer_instruction' }, // no awareness date
];

const line = '-'.repeat(70);
for (const s of samples) {
  const c = assessContractClock(s, undefined, NOW);
  console.log(line);
  console.log(`${s.id}  ·  ${EVENT_CLASS_LABELS[s.eventClass]}`);
  console.log(
    `  Status : ${CLOCK_STATUS_LABELS[c.status].toUpperCase()}  ` +
      `(${c.daysRemaining ?? '—'} days · deadline ${c.deadline ?? '—'} · ${c.clause ?? 'n/a'})`,
  );
  console.log(`  Why    : ${c.rationale}`);
}
console.log(line);
console.log('Operational prioritisation only — not a determination of entitlement.');
