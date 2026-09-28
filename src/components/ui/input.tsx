import type { InputHTMLAttributes, LabelHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md bg-elevated px-3 text-sm text-fg placeholder:text-subtle shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] focus:shadow-[0_0_0_2px_var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-32 w-full rounded-lg bg-elevated p-3 text-sm leading-relaxed text-fg placeholder:text-subtle shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-fg)_12%,transparent)] focus:shadow-[0_0_0_2px_var(--color-accent)]",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-muted", className)} {...props} />;
}
