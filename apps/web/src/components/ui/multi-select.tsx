"use client";

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { shouldSearch, summariseSelection } from "@/lib/onboarding/disclosure";
import { cn } from "@/lib/utils";

/**
 * Several answers, chosen from a menu that is closed until it is asked for.
 *
 * The pairing that makes this work is the menu plus the chips underneath it:
 * the menu keeps twenty options off the screen, and the chips keep the answer
 * on it. A collapsed control on its own trades one problem for another — the
 * person can no longer see what they have already said without reopening it.
 *
 * Selecting does not close the menu, because "pick up to eight" means eight
 * trips through open-pick-reopen otherwise. Long lists get a search box, since
 * past a screenful nobody reads a list they can type into.
 */

export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps {
  values: string[];
  onChange: (next: string[]) => void;
  options: readonly MultiSelectOption[];
  /** Selection cap. Reaching it disables what is not already chosen. */
  max?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  id?: string;
  disabled?: boolean;
  /** Applied to the trigger, for callers on a different surface. */
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function MultiSelect({
  values,
  onChange,
  options,
  max,
  placeholder = "Choose any that apply",
  searchPlaceholder = "Type to narrow the list…",
  id,
  disabled,
  className,
  ...aria
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  /**
   * Anything already chosen is in the menu, even if the list no longer offers
   * it. Otherwise an answer saved against an older version of the list can be
   * removed but never put back, and the menu quietly disagrees with the chips
   * underneath it.
   */
  const items = useMemo(() => {
    const known = new Set(options.map((option) => option.value));
    const extra = values
      .filter((value) => !known.has(value))
      .map((value) => ({ value, label: value }));
    return extra.length ? [...options, ...extra] : options;
  }, [options, values]);

  const cap = max ?? items.length;
  const atCap = values.length >= cap;
  const searchable = shouldSearch(items.length);

  const labelFor = useMemo(() => {
    const map = new Map(items.map((option) => [option.value, option.label]));
    return (value: string) => map.get(value) ?? value;
  }, [items]);

  /**
   * Derived from the argument rather than read back out of `values` in a later
   * tick: two quick taps otherwise both compute their next list from the same
   * render's props and the first one is silently dropped.
   */
  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter((entry) => entry !== value));
      return;
    }
    if (values.length >= cap) return;
    onChange([...values, value]);
  }

  const summary = summariseSelection(values.map(labelFor));

  return (
    <div>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger
          id={id}
          type="button"
          disabled={disabled}
          {...aria}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-ink/15 bg-paper px-4 text-left text-[15px]",
            summary ? "text-ink" : "text-ink/60",
            "hover:border-ink/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
        >
          <span className="truncate">{summary || placeholder}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-ink/65" aria-hidden />
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={6}
            className={cn(
              "z-50 overflow-hidden rounded-xl border border-ink/10 bg-paper p-0 shadow-xl",
              "w-[var(--radix-popover-trigger-width)]",
            )}
          >
            <Command
              // The cap is expressed by disabling items, and cmdk keeps
              // disabled items out of keyboard navigation.
              className="bg-transparent"
            >
              {searchable && <CommandInput placeholder={searchPlaceholder} />}
              <CommandList className="max-h-[min(18rem,var(--radix-popover-content-available-height))]">
                <CommandEmpty>Nothing matches that.</CommandEmpty>
                {items.map((option) => {
                  const on = values.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      // cmdk matches typed text against this, so it has to be
                      // the words on screen rather than an id.
                      value={option.label}
                      disabled={!on && atCap}
                      onSelect={() => toggle(option.value)}
                      // min-h-11: a menu row is a touch target like any other.
                      className="min-h-11 gap-3 py-2.5"
                      role="option"
                      aria-selected={on}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          // An explicit small radius, not `rounded-md`: the
                          // brand radius is 12px, which on a 20px box is a
                          // circle, and a circle means "pick one".
                          "flex size-5 shrink-0 items-center justify-center rounded-[5px] border",
                          on ? "border-forest bg-forest text-paper" : "border-ink/25",
                        )}
                      >
                        {on && <CheckIcon className="size-3.5" />}
                      </span>
                      <span className="text-[15px] text-ink">{option.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandList>

              {max !== undefined && (
                <p className="border-t border-ink/10 px-3 py-2 text-[13px] text-ink/65">
                  {values.length} of {max} chosen{atCap ? " — that is the maximum" : ""}
                </p>
              )}
            </Command>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* The answer, kept on screen after the menu closes. */}
      {values.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li key={value}>
              <button
                type="button"
                onClick={() => toggle(value)}
                // Named for what pressing it does, rather than repeating the
                // label that is already sitting inside it.
                aria-label={`Remove ${labelFor(value)}`}
                className="flex items-center gap-1.5 rounded-full bg-forest/10 py-1.5 pl-3 pr-2 text-[14px] text-ink hover:bg-forest/15"
              >
                {labelFor(value)}
                <XIcon className="size-3.5 text-ink/65" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
