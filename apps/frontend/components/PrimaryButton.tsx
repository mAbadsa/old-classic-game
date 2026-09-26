import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Bright-yellow arcade CTA button — thick black pixel shadow that collapses on press. */
export function PrimaryButton({ className, type = "button", ...props }: PrimaryButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "pixel-button [--pixel-shadow-color:#000000] inline-flex items-center justify-center gap-2",
        "border-[3px] border-[#ffff00] bg-[#ffff00] px-6 py-3",
        "font-arcade text-sm font-bold text-black",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffff00] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
