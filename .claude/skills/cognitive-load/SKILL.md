---
name: "cognitive-load"
description: "Brigade's rules for screens people have to think their way through — onboarding steps, forms, questions, filters, settings, dashboards. Use when building or changing any screen that asks someone for something, when a list of options is going on screen, or when reviewing a UI change before calling it done. Enforces progressive disclosure (long option lists collapse into dropdowns rather than showing everything at once), one decision per screen, and answers that stay visible."
---

# Cognitive load

Every screen spends someone's attention. This skill is the standing decision about
how much it is allowed to spend, so it is not re-argued on each feature and does not
come out differently each time.

Brigade's members are cooks, often answering on a phone, often between services. A
screen that needs studying gets skipped, and a skipped question is worse than a
missing feature: the matcher runs on answers, so an overwhelming question quietly
degrades the product's core.

## The rules

**1. One decision per screen.** A step in a flow asks one question. Two unrelated
questions on one screen means two screens. Related short fields (city + country +
timezone) are one question.

**2. Options collapse past five.** More than `INLINE_OPTION_LIMIT` (5) options go
behind a dropdown, not on the screen. This is not a judgement call —
`controlFor()` in `apps/web/src/lib/onboarding/disclosure.ts` derives it from the
option count, and the renderer calls it. Past `SEARCH_OPTION_LIMIT` (8) the menu
gets a search box. Five or fewer stay on screen as tap-to-answer, because a menu
would be more work than the question.

**3. The answer stays visible.** A control that hides its options must show what was
chosen once it closes — the value in the trigger, chips underneath for multi-select.
Collapsing options is only a win if it does not force people to reopen the menu to
remember what they said.

**4. One primary action.** One filled button per screen. Everything else — Back,
Skip, Change — is a text link or an outline button. If two things look equally
primary, neither is.

**5. Never make someone count or guess.** Show the cap ("2 of 8 chosen"), the
progress, the character count, the price, the consequence. A silent limit that
stops responding is a bug.

**6. Defaults over blanks.** If a sensible default exists, use it — timezone from
`Intl`, today's date, the only plausible option. A required field with an obvious
answer is a question that should not have been asked.

**7. Save as it is given.** Every answer persists when it is given, not on submit.
Closing a tab costs nothing. Nothing important sits only in component state.

**8. Prefer reversible to confirmable.** Let people undo instead of stopping them to
confirm. Keep confirmation for things that cannot be undone.

**9. Ask like a person.** Second person, one idea per sentence, no product jargon,
no invented labels ("expertise areas" → "what you teach"). If the label needs a
tooltip to be understood, rewrite the label.

**10. Same job, same control.** A single-choice question looks and behaves the same
everywhere in the product. People should learn this app once. Do not invent a new
picker for one screen.

**11. Do not add a beat to look busy.** No artificial loading, no fake "personalising
your matches" pause, no screen that exists to show work happened.

**12. Reachable on a phone.** Touch targets ≥44px, inputs ≥16px text (smaller zooms
iOS), no horizontal scroll at 375px, menus that fit the viewport.

## Applying it

Build questions out of `apps/web/src/components/ui/select.tsx` (one answer) and
`multi-select.tsx` (several). Do not hand-roll a chip grid, a `<select>`, or a
listbox — see `references/controls.md` for the props, thresholds, accessibility
requirements and the mistakes already made and fixed in these components.

In the member flow, a new question is a new entry in
`apps/web/src/lib/onboarding/mentee-steps.ts`. It gets its control from its option
count automatically; do not set `control` unless there is a reason written next to
it.

`references/audit.md` records which screens already obey this and which do not, so
the next change knows what it is walking into.

## Before calling a UI change done

- Count the options on screen. More than five that are not a filter rail? Collapse them.
- Close every menu on the screen. Can you still see what you answered?
- Count the filled buttons. More than one?
- Is every cap, count and consequence stated rather than implied?
- Does a wrong tap cost anything?
- At 375px: no horizontal scroll, targets ≥44px, menus fit.
- Keyboard: Tab reaches everything, Escape closes, Enter does the obvious thing.
- Screen reader: every control has a name that says what it does, not what it contains.

Verify these in a browser against the running app. A screenshot of the real screen
is the evidence; reasoning about the JSX is not.
