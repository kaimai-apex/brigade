import { cn } from "@/lib/utils";

export function Checkbox({
  className,
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-ink/20 text-forest focus:ring-forest"
        {...props}
      />
      <span className="text-sm leading-relaxed">{label}</span>
    </label>
  );
}
