import { cn } from "../../lib/utils";
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "rounded-xl px-3 py-2 text-sm font-medium transition",
        variant === "primary" && "bg-gray-900 text-white hover:bg-gray-800",
        variant === "ghost" && "bg-transparent text-gray-700 hover:bg-gray-100",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
