import { useId, type ReactNode } from "react";

export interface ToolSectionProps {
  /** "01" → "(01)" before the title. */
  number?: string;
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * A titled part of a tool's page, on the Swiss grid: the label hangs in the left
 * column (2 of 8 on iPad, 2 of 12 on desktop) and the content starts at column 3.
 */
export function ToolSection({
  number,
  title,
  children,
  className,
}: ToolSectionProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={`grid-swiss gap-y-4 border-t border-ink pt-4 md:pt-5 ${className ?? ""}`}
    >
      <h2 id={id} className="col-span-4 type-label md:col-span-2">
        {number && <span className="text-muted">({number}) </span>}
        {title}
      </h2>
      <div className="col-span-4 min-w-0 md:col-span-6 xl:col-span-10">
        {children}
      </div>
    </section>
  );
}
