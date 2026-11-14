import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/** A label, its control, and an optional line of help beneath. */
export function FormField({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field ${className}`} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field min-h-24 ${className}`} />;
}

type Option = { value: string; label: string };

/**
 * A dropdown. Required ones open on a disabled "Choose…"; optional ones pass
 * `emptyLabel` ("TBD", "None") for a blank choice that can be picked.
 */
export function Select({
  options,
  placeholder = "Choose…",
  emptyLabel,
  className = "",
  defaultValue,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: (Option | string)[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  return (
    <select {...props} defaultValue={defaultValue ?? ""} className={`field ${className}`}>
      <option value="" disabled={emptyLabel === undefined}>
        {emptyLabel ?? placeholder}
      </option>
      {options.map((option) => {
        const { value, label } = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={value} value={value}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

/** A labelled checkbox; submits "on" when ticked. */
export function Checkbox({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" {...props} className="size-4 accent-[var(--accent)]" />
      {label}
    </label>
  );
}
