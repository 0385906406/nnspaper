import { useId, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({
  label,
  error,
  className,
  id,
  ...props
}: TextareaProps) {
  // useId ổn định giữa server và client; Math.random() làm lệch id khi hydrate
  const autoId = useId();
  const textareaId = id || autoId;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        {...props}
        className={`rounded-lg border ${
          error ? "border-danger" : "border-border"
        } bg-surface-2 px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none ${className || ""}`}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
