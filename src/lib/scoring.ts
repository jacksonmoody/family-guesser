import { type Tier } from "./kinship/pairs";

export const RUN_DURATION_SECONDS = 5 * 60;

/** Grace period for answers that were submitted right at the buzzer. */
export const ANSWER_GRACE_SECONDS = 3;

export const TIER_POINTS: Record<Tier, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

export const HARD_MODE_MULTIPLIER = 1.5;

export function pointsFor(tier: Tier, hardMode: boolean): number {
  return Math.round(TIER_POINTS[tier] * (hardMode ? HARD_MODE_MULTIPLIER : 1));
}
