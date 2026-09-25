import type { Seco } from './types.js';
import { addDays, dayDiff, isoDate, toDate } from './dates.js';
import { NEC4_PROFILE, type ContractProfile } from './nec4Profile.js';

export type ClockStatus = 'green' | 'amber' | 'red' | 'expired' | 'unknown';

export const CLOCK_STATUS_LABELS: Record<ClockStatus, string> = {
  green: 'On clock',
  amber: 'Time-sensitive',
  red: 'Act now',
  expired: 'Window passed',
  unknown: 'Insufficient information',
};

/**
 * Standing product disclaimer. The Contract Clock is an operational
 * prioritisation signal — never a legal determination (business plan §4.3).
 */
export const CLOCK_DISCLAIMER =
  'Operational prioritisation only. Not legal advice or a determination of contractual entitlement.';

export interface ClockResult {
  status: ClockStatus;
  /** Whole days until the configured window closes (negative once passed). */
  daysRemaining: number | null;
  /** ISO date the window closes. */
  deadline: string | null;
  clause: string | null;
  mechanism: string | null;
  windowDays: number | null;
  /** Plain-language explanation of the status. */
  rationale: string;
  /** Always false — this engine never determines entitlement. */
  isDetermination: false;
  disclaimer: string;
}

/**
 * Assess the Contract Clock for a SECO.
 *
 * @param seco     the event
 * @param profile  contract profile (defaults to NEC4)
 * @param now      assessment date (defaults to current time; inject for tests)
 */
export function assessContractClock(
  seco: Seco,
  profile: ContractProfile = NEC4_PROFILE,
  now: Date = new Date(),
): ClockResult {
  const mechId = seco.mechanismId ?? profile.byClass[seco.eventClass];
  const mech = mechId ? profile.mechanisms[mechId] : undefined;
  const awareness = toDate(seco.awarenessDate);

  const base = {
    clause: mech?.clause ?? null,
    mechanism: mech?.label ?? null,
    windowDays: mech?.windowDays ?? null,
    isDetermination: false as const,
    disclaimer: CLOCK_DISCLAIMER,
  };

  if (!mech) {
    return {
      ...base,
      status: 'unknown',
      daysRemaining: null,
      deadline: null,
      rationale: 'No contract mechanism is configured for this event class.',
    };
  }
  if (!awareness) {
    return {
      ...base,
      status: 'unknown',
      daysRemaining: null,
      deadline: null,
      rationale:
        'No awareness date recorded — timing cannot be assessed. Capture when the team became aware.',
    };
  }

  const deadline = addDays(awareness, mech.windowDays);
  const daysRemaining = dayDiff(deadline, now);
  const { redWithinDays, amberWithinDays } = profile.thresholds;

  let status: ClockStatus;
  if (daysRemaining < 0) status = 'expired';
  else if (daysRemaining <= redWithinDays) status = 'red';
  else if (daysRemaining <= amberWithinDays) status = 'amber';
  else status = 'green';

  return {
    ...base,
    status,
    daysRemaining,
    deadline: isoDate(deadline),
    rationale: buildRationale(status, daysRemaining, mech.clause, mech.note),
  };
}

function buildRationale(
  status: ClockStatus,
  daysRemaining: number,
  clause: string,
  note?: string,
): string {
  const notePart = note ? ` ${note}` : '';
  switch (status) {
    case 'expired':
      return `The ${clause} window closed ${Math.abs(daysRemaining)} day(s) ago. Recognition was late; the review route may be constrained.${notePart}`;
    case 'red':
      return `${daysRemaining} day(s) left within the ${clause} window. Act now.${notePart}`;
    case 'amber':
      return `${daysRemaining} day(s) left within the ${clause} window. Becoming time-sensitive.${notePart}`;
    default:
      return `${daysRemaining} day(s) left within the ${clause} window. Within the normal review period.${notePart}`;
  }
}
