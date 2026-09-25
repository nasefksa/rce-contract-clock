import type { EventClass } from './types.js';

/** A configured contract timing mechanism (a clause + its window). */
export interface ClockMechanism {
  id: string;
  /** Clause reference shown to the user. */
  clause: string;
  /** Human label for the mechanism. */
  label: string;
  /** Days from awareness within which action should be taken. */
  windowDays: number;
  /** Optional operational note (e.g. "act without delay"). */
  note?: string;
}

/** How many days of remaining window map to each colour. */
export interface ClockThresholds {
  /** daysRemaining <= this => red. */
  redWithinDays: number;
  /** daysRemaining <= this => amber. */
  amberWithinDays: number;
}

/** A full, swappable contract profile. */
export interface ContractProfile {
  name: string;
  thresholds: ClockThresholds;
  /** Default mechanism id for each event class. */
  byClass: Record<EventClass, string>;
  mechanisms: Record<string, ClockMechanism>;
}

/**
 * Default NEC4 ECC profile.
 *
 * The 8-week (56-day) awareness bar in clause 61.3 is the governing NEC time
 * limit for contractor-notified compensation events; the class-specific clauses
 * describe *why* an event may be compensable. Windows and thresholds are fully
 * configurable — this is a starting profile, not a fixed rule.
 */
export const NEC4_PROFILE: ContractProfile = {
  name: 'NEC4 ECC (default)',
  thresholds: { redWithinDays: 7, amberWithinDays: 21 },
  byClass: {
    late_information: 'nec_61_3',
    access_obstruction: 'nec_60_1_5',
    unforeseen_physical_conditions: 'nec_60_1_12',
    client_designer_instruction: 'nec_60_1_1',
    predecessor_caused_rework: 'nec_61_3',
  },
  mechanisms: {
    nec_61_3: {
      id: 'nec_61_3',
      clause: 'NEC4 cl. 61.3',
      label: 'Contractor notification — 8-week awareness bar',
      windowDays: 56,
    },
    nec_60_1_1: {
      id: 'nec_60_1_1',
      clause: 'NEC4 cl. 60.1(1)',
      label: 'Instruction changing the Scope',
      windowDays: 56,
    },
    nec_60_1_5: {
      id: 'nec_60_1_5',
      clause: 'NEC4 cl. 60.1(5)',
      label: 'Works by Others / access not given',
      windowDays: 56,
    },
    nec_60_1_12: {
      id: 'nec_60_1_12',
      clause: 'NEC4 cl. 60.1(12)',
      label: 'Physical conditions',
      windowDays: 56,
      note: 'Physical conditions should be actioned without delay; the 8-week bar still applies to notification.',
    },
  },
};
