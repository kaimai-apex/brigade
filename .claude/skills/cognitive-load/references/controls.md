# Asking a question in Brigade

Which control, how to wire it, and the mistakes already paid for.

## The rule module

`apps/web/src/lib/onboarding/disclosure.ts` — imports nothing, so it can be asserted
directly in a spec (`apps/web/spec/onboarding.spec.ts`, the "Progressive disclosure"
group). It exports:

| Export | What it decides |
| --- | --- |
| `INLINE_OPTION_LIMIT` (5) | The most options allowed on screen before collapsing |
| `SEARCH_OPTION_LIMIT` (8) | Where a menu gets a search box |
| `controlFor({options, control})` | `"inline"` or `"dropdown"` — call it, do not re-derive it |
| `shouldSearch(count)` | Whether a menu needs typing |
| `summariseSelection(labels)` | `"Yachts, Estates +2"` for a closed trigger |

Change the thresholds in that one file and the whole product follows. That is the
point of it being one file.

## One answer — `@/components/ui/select.tsx`

```tsx
<Select
  value={role}                       // "" shows the placeholder
  onValueChange={(next) => void save({ role: next })}
  options={HOSPITALITY_ROLES.map((r) => ({ value: r, label: r }))}
  placeholder="Choose one"
  aria-label={question}              // or htmlFor/id against a <label>
/>
```

Radix Select underneath: typeahead, arrow keys, Escape, and the native picker on
mobile all come with it. A whole-component API rather than eight exported parts, so
two questions in the same flow cannot end up looking different.

**A stored value that is not in the options is appended to the list.** Radix renders
nothing for a value with no matching item, so without this a profile holding a role
from an older list shows an empty control next to an enabled Continue. Found by
walking the real demo account, whose role is `"Chef"` — a string no current list
offers.

**Do not auto-advance a dropdown answer.** The menu closing and the page changing
underneath it is disorienting in a way that a tapped list row is not. Inline lists
advance on tap; dropdowns get a Continue.

## Several answers — `@/components/ui/multi-select.tsx`

```tsx
<MultiSelect
  values={selected}
  onChange={(next) => { setSelected(next); void save({ skillsWanted: next }); }}
  options={SKILLS.map((s) => ({ value: s, label: s }))}
  max={8}                            // renders "3 of 8 chosen"; disables the rest at the cap
  aria-label={question}
/>
```

Popover + cmdk. It shows a search box on its own past eight options, keeps the menu
open while picking, and renders the chosen values as removable chips under the
trigger — the chips are the half that makes collapsing safe (rule 3).

Selected values missing from `options` are appended, so an answer saved against an
older list can be put back after it is removed.

## Gotchas paid for already

- **`rounded-md` on a small box is a circle here.** `--radius` is 0.75rem, so a 20px
  checkbox comes out fully round and reads as a radio — "pick one" on a question
  that takes several. Small squares use an explicit radius.
- **Menu rows are touch targets.** cmdk and Radix items are `div`s, so the global
  48px mobile rule for `button` does not reach them. Both components set `min-h-11`.
- **Name the control, not its contents.** A chip whose job is removal is
  `aria-label="Remove Food costing"`, not label text plus a visually hidden repeat.
- **cmdk filters on the `value` prop**, so pass the visible label as `value` or
  search matches nothing people can see.
- **Compute the next selection from the argument**, never from a render closure —
  two quick taps otherwise both read the same stale array and the first is dropped.
  This bug has been fixed twice in this codebase.
- **The ⌘K command palette is also cmdk.** `document.querySelectorAll('[cmdk-item]')`
  in a debugging session matches its items too.

## When a wall of options is correct

The directory filter rail (`components/directory/directory-filters.tsx`) shows every
facet with its count in a scrolling column, and should keep doing so. A filter rail
is browsed, not answered: the counts are the information, comparison across them is
the task, and the rail sits beside results rather than blocking them. The rule in
this skill is about questions someone must answer to continue.

Native `<select>` also stays where the list is enormous and the person already knows
the word — the timezone field is 400+ entries and typing to jump is exactly right.
