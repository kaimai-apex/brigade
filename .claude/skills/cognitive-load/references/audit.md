# Where the app stands

Checked 2026-08-04, on branch `feat/onboarding-matching`, against the running local
stack. Update this when you change one of these screens.

## Obeys the rule

| Screen | How |
| --- | --- |
| Member onboarding, `/onboarding` | Every question renders through `controlFor`. Role (11), experience (6), workplace (7) are dropdowns; session length (4) and mentor seniority (4) stay tap-to-answer. Skills (20), goals (10), help (10), industries (10), languages (14) are searchable multi-selects with chips. |
| Mentor setup, step 2 "Who you help" | Four questions, four collapsed menus. Was ~40 chips in one column. |
| Mentor setup, step 1 "What you teach" | 20 skills behind a searchable menu, free-text additions still land in the same list. |
| Old detailed steps (`/onboarding/basic-info`, `experience`, `education`, `portfolio`, `availability`) | Native `<select>` for role, short toggle groups, and plain fields. Nothing over the limit. |
| `/settings/profile` | Same native role select. |

## What the flow tells you about itself (added 2026-08-04)

Rule 5 says never make someone count or guess, and a fifteen-screen corridor is the
place that matters most. All of it is derived, not written down, so none of it can
become a comforting lie:

| Signal | Where | Derived from |
| --- | --- | --- |
| Progress bar | `progressPercent(index, total)` | Position. It used to be a hand-written `percent` per step, and four consecutive questions shared one value — the bar stood still through four answers, which reads as broken. Every answer now moves it. |
| "6 left · About 2 min left" | `questionsRemaining` + `timeRemainingLabel(remainingSeconds(…))` | The real remaining steps, costed per kind. Rounds up, never down. |
| Section outline on the welcome screen | `phaseOutline(MENTEE_STEPS)` | The steps that exist. Knowing a form's shape before starting it is what makes a long one feel short. |
| Resume point | `resumeIndex(steps, answers)` | The first unanswered *required* step. A skip is a decision, so an optional step never holds the resume point. |

`apps/web/spec/onboarding.spec.ts` asserts all four (progress.ts imports nothing, for
the same reason disclosure.ts does not).

## Feedback per answer (added 2026-08-04)

Motion and sound are on every answer; both are information, not decoration, and both
have an off switch that works.

- **Direction** — the screen slides in from the right going forward, the left going
  back (`.ob-step[data-direction]`), and the cues rise going forward and fall going
  back. Someone can tell which way they went without reading.
- **Section endings only** — a celebration fires at a phase boundary, about five
  times in the flow. Praise for every answer is worth nothing by the third one.
- **`prefers-reduced-motion`** disables every animation in the `.ob-*` block, and the
  confetti burst returns early. Nothing there carries information not also written
  down.
- **Sound** is synthesised in `lib/onboarding/sound.ts` (no audio assets, no
  requests), defaults on, and the mute toggle sits in the onboarding header — a mute
  control nobody can find is the same as no mute control. The preference is
  remembered.
- **Digit shortcuts** answer inline options; the hints are drawn only under
  `@media (hover: hover)`, where a keyboard actually exists.

Rule 11 still holds: no artificial pause anywhere. The celebrations mark work that
was really done.

## Deliberately not collapsed

- **Directory filter rail** (`components/directory/directory-filters.tsx`) — facets
  with counts in scrolling sections. Browsing surface, not a question. See
  `controls.md`.
- **Timezone field** — native `<select>` over 400+ zones from `Intl`. Typing to jump
  beats any custom menu.

## Known gaps

- The `welcome` screen now shows the section outline and the estimate; the `text`
  step is still a plain textarea with a character count.
- Contrast: `text-ink/40` (~2.5:1) and `text-ink/50` (~3.3:1) on white both fail
  WCAG AA and were in use across the flow. They are `/60`–`/65` now, and axe is
  clean over seven onboarding steps. **The same failure still exists elsewhere** —
  `--mk-subtle` on the landing page is 3.57:1 and `scripts/check-a11y.mjs` fails on
  `/` because of it. Anything below `text-ink/60` on white is a bug.
- `apps/web/spec/onboarding.spec.ts` asserts the rule function and the taxonomy
  lists it governs. It cannot import `mentee-steps.ts` — the spec runner resolves
  imports literally and that module imports `./taxonomy` without an extension, which
  the app's bundler requires it to. The step definitions are therefore covered
  structurally (the renderer always calls `controlFor`) rather than by assertion.
- No automated check counts options rendered on screen. A reliable static check
  would need to resolve the arrays, so review and the checklist in `SKILL.md` carry
  that part.
