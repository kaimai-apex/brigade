"use client";

import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

/**
 * One answer, chosen from a menu that is closed until it is asked for.
 *
 * Deliberately not a set of primitives to assemble. Every caller wants the same
 * thing — a labelled trigger, a scrollable list, a tick on the current answer —
 * and eight exported parts would mean eight chances for two questions in the
 * same flow to end up looking and behaving differently. One component, one set
 * of props, one appearance.
 *
 * Radix rather than a native `<select>` because the menu has to be styleable
 * and keyboard-navigable in the same way on every platform, and because a
 * native select on desktop cannot show a tick against the current answer.
 * Typeahead, Escape, arrow keys and the mobile picker all still work — Radix
 * implements the listbox pattern, it does not reinvent it.
 */

export interface SelectOption {
  value: string;
  label: string;
  /** Secondary line, for options whose label alone is ambiguous. */
  hint?: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  /** What the trigger says before an answer exists. */
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  /** Applied to the trigger, for callers on a different surface. */
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder = "Choose one",
  id,
  name,
  disabled,
  className,
  ...aria
}: SelectProps) {
  /**
   * A stored answer the list does not offer is still shown.
   *
   * Radix renders nothing for a value with no matching item, so a profile
   * holding a role from an older version of the list — or from a different
   * flow — would show an empty control next to an enabled Continue, and the
   * person would have no way of knowing what we already had. Appending it says
   * so, and leaves them free to change it.
   */
  const items =
    !value || options.some((option) => option.value === value)
      ? options
      : [...options, { value, label: value }];

  return (
    <SelectPrimitive.Root
      // Radix treats "" as "no value", which is what shows the placeholder.
      value={value || undefined}
      onValueChange={onValueChange}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        data-slot="select-trigger"
        {...aria}
        className={cn(
          // h-12: the same 48px target as every other control in a form here.
          "flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-ink/15 bg-paper px-4 text-left text-[15px] text-ink",
          "data-[placeholder]:text-ink/60 hover:border-ink/35",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 shrink-0 text-ink/65" aria-hidden />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-50 overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-xl",
            // Never taller than the space it has, so the list scrolls instead
            // of the page jumping to fit it.
            "max-h-[min(20rem,var(--radix-select-content-available-height))]",
            "w-[var(--radix-select-trigger-width)]",
          )}
        >
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-ink/65">
            <ChevronUpIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollUpButton>

          <SelectPrimitive.Viewport className="p-1">
            {items.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  // min-h-11: a menu row is a touch target like any other.
                  "relative flex min-h-11 cursor-pointer select-none items-start gap-3 rounded-lg py-2.5 pl-3 pr-9 text-[15px] text-ink outline-none",
                  "data-[highlighted]:bg-ink/[0.04] data-[state=checked]:font-medium",
                )}
              >
                <span className="min-w-0 flex-1">
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  {option.hint && (
                    <span className="mt-0.5 block text-[13px] text-ink/65">{option.hint}</span>
                  )}
                </span>
                <SelectPrimitive.ItemIndicator className="absolute right-3 top-3">
                  <CheckIcon className="size-4 text-forest" aria-hidden />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>

          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-ink/65">
            <ChevronDownIcon className="size-4" aria-hidden />
          </SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
