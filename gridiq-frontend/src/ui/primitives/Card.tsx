import { cn } from "../../lib/utils";
import type { PropsWithChildren } from "react";

export function Card({ className, children }: PropsWithChildren<{ className?: string }>) {
  return <div className={cn("rounded-2xl border border-gray-100 bg-white p-4 shadow-sm", className)}>{children}</div>;
}
