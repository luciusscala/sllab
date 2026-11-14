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

export function Select({
  options,
  placeholder = "Choose…",
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: (Option | string)[];
  placeholder?: string;
}) {
  return (
    <select {...props} className={`field ${className}`}>
      <option value="" disabled>
        {placeholder}
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
