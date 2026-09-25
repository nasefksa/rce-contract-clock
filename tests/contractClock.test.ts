import { describe, it, expect } from 'vitest';
import { assessContractClock, NEC4_PROFILE, type Seco } from '../src/index.js';

const NOW = new Date('2026-03-01T12:00:00Z');

function seco(partial: Partial<Seco>): Seco {
  return { id: 'EVT-TEST', eventClass: 'late_information', ...partial };
}

describe('Contract Clock', () => {
  it('returns unknown when no awareness date is recorded', () => {
    const r = assessContractClock(seco({}), NEC4_PROFILE, NOW);
    expect(r.status).toBe('unknown');
    expect(r.daysRemaining).toBeNull();
  });

  it('is green early in the window', () => {
    const r = assessContractClock(seco({ awarenessDate: '2026-03-01' }), NEC4_PROFILE, NOW);
    expect(r.status).toBe('green');
    expect(r.daysRemaining).toBe(56);
    expect(r.deadline).toBe('2026-04-26');
  });

  it('turns amber inside 21 days remaining', () => {
    const r = assessContractClock(seco({ awarenessDate: '2026-01-20' }), NEC4_PROFILE, NOW);
    expect(r.daysRemaining).toBe(16);
    expect(r.status).toBe('amber');
  });

  it('turns red inside 7 days remaining', () => {
    const r = assessContractClock(seco({ awarenessDate: '2026-01-10' }), NEC4_PROFILE, NOW);
    expect(r.daysRemaining).toBe(6);
    expect(r.status).toBe('red');
  });

  it('expires once the window has passed', () => {
    const r = assessContractClock(seco({ awarenessDate: '2025-12-21' }), NEC4_PROFILE, NOW);
    expect(r.daysRemaining).toBeLessThan(0);
    expect(r.status).toBe('expired');
  });

  it('reports the governing clause per event class', () => {
    const phys = assessContractClock(
      seco({ eventClass: 'unforeseen_physical_conditions', awarenessDate: '2026-03-01' }),
      NEC4_PROFILE,
      NOW,
    );
    expect(phys.clause).toBe('NEC4 cl. 60.1(12)');
  });

  it('never claims to be a determination', () => {
    const r = assessContractClock(seco({ awarenessDate: '2026-03-01' }), NEC4_PROFILE, NOW);
    expect(r.isDetermination).toBe(false);
    expect(r.disclaimer).toMatch(/not legal advice/i);
  });

  it('respects a custom mechanism override', () => {
    const r = assessContractClock(
      seco({ awarenessDate: '2026-02-25', mechanismId: 'nec_60_1_1' }),
      NEC4_PROFILE,
      NOW,
    );
    expect(r.clause).toBe('NEC4 cl. 60.1(1)');
  });
});
