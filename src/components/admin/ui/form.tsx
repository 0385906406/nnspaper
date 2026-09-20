import { ReactNode } from "react";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
}

interface FormGroupProps {
  children: ReactNode;
}

interface FormActionsProps {
  children: ReactNode;
}

export function Form({ children, className, ...props }: FormProps) {
  return (
    <form {...props} className={`space-y-6 ${className || ""}`}>
      {children}
    </form>
  );
}

export function FormGroup({ children }: FormGroupProps) {
  return <div className="space-y-3">{children}</div>;
}

export function FormActions({ children }: FormActionsProps) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-border/30 pt-6">
      {children}
    </div>
  );
}
