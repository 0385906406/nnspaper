import { ReactNode } from "react";
import Link from "next/link";
import { Button } from "./ui";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
    variant?: "primary" | "secondary";
  };
  children?: ReactNode;
}

export function PageHeader({
  title,
  description,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {action && (
          <Link href={action.href}>
            <Button variant={action.variant || "primary"}>
              {action.label}
            </Button>
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
