import type { ReactNode } from "react";

/** What a list shows when it has nothing in it: what belongs here, and the way to add the first one. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card px-6 py-14 text-center">
      <p className="headline text-lg">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
