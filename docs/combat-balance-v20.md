# v20 combat and dungeon balance — 2026-09-28

## Intent

Preserve slow early magic, uneven job growth, one base mastery per victory, and the existing conditional mastery bonus cap. Equipment values and experience requirements are unchanged. Strengthen the need to develop skills, jobs, and rebirth research before later dungeon clears. This change does not establish a validated one-year progression curve.

## Enemy and expedition changes

- Level scaling: HP × `1 + max(0, level - 5) × .035`; attack × `1 + max(0, level - 8) × .012`; defenses × `1 + max(0, level - 10) × .006`.
- Boss growth `g = clamp((level - 14) / 24, 0, 1)`: HP factor `2.1 + .6g`, physical attack factor `1.2 + .25g`, magic factor `1.08 + .17g`. These combine with ordinary enemy scaling. Boss critical chance is 8%.
- Dungeon wave index 0–4 adds HP × `1.05 + .04w`, attack × `1.04 + .025w`, defenses × `1 + .02w`.
- Boss reward multiplier stays 1.9, separate from combat strength.
- Dungeon victory healing is 8% of maximum HP (ordinary hunting remains 16%). Entering starts three real preparation turns (six seconds); HP/MP refill when preparation completes, not immediately on entry.
- Codex and dungeon previews use the same scaled enemy stats as spawning. Dungeon cards show final-boss defenses and offensive stats; entry level is explicitly a minimum, not a clear recommendation.

## Active routing comparison

Baseline source: `1cbc6cea7a92a5463ef7958d7d3cdd16f011b2c3` (v19).
Run `node scripts/check-active-routing.mjs [--baseline]` from the project root.
Each cell spans seeds 11 and 29, in simulated active hours to level 30, the first rebirth threshold.

| Setup | Build | v19 | v20 |
|---|---|---:|---:|
| No equipment or gold training | Physical | 4.23–4.70 | 10.09–10.16 |
| No equipment or gold training | Magic | 8.76–9.04 | 18.74–19.00 |
| Existing drops and gold training | Physical | 1.79–2.08 | 5.29–6.44 |
| Existing drops and gold training | Magic | 3.47–3.68 | 9.61–10.76 |

Allocate level-up stats immediately, manage current loadouts, claim research SP, change jobs when eligible, focus individual monsters, and compare five-minute samples of eligible fields/dungeons. Attempt feasible first dungeon clears for their progression rewards before ordinary XP routing. Equipment-enabled runs replace equipment with existing drops and buy existing gold training; no equipment balance changes were made.

These are fixed build heuristics with advance information, not an exhaustive fastest-route search or a promised player completion time. Two seeds do not establish a distribution. Earlier v19 estimates omitted important active routing opportunities and should not be used as fastest-play baselines. The comparison measures first-cycle pacing, not a year of rebirths.

## Whole expedition verification

`node scripts/check-expedition.mjs` completed 720 expeditions: 30 fixed fixtures × 24 seeds. The engine executes all waves, preparation, resource attrition, and existing level-up recovery. Fixtures have no equipment or gold training.

At unprogressed Lv40, the tested builds could not clear caldera. With Lv40, 30 rebirths, attack/HP/guard research at 10 each, and 30,000 job/learned-skill practice, both builds cleared caldera in all 24 seeds; temple cleared 24/24 physical and 23/24 magic. Research costs total 385 pearls, within the cumulative rewards of that rebirth count. This is a reachability fixture, not evidence that 30 rebirths are required or that a real route earns every fixture value at that point.

Engine assertions passed for delayed preparation recovery, preview/spawn stat agreement, unchanged boss XP multiplier, base mastery +1, and increasing wave pressure. Existing growth regressions and TypeScript validation passed. Dungeon cards and v20 label were inspected in the local preview.
