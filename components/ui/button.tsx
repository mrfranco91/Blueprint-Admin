import * as React from "react"
import { cn } from "@/lib/utils"

function Button({ className, variant = "default", size = "default", ...props }: React.ComponentProps<"button"> & { variant?: "default" | "secondary" | "outline" | "ghost" | "link", size?: "default" | "sm" | "lg" | "icon" }) {
  const variants = {
    default: "bg-primary text-primary-foreground border border-primary/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_18px_rgba(11,53,89,0.16)] hover:brightness-[1.03] active:brightness-[0.98]",
    secondary: "bg-secondary text-secondary-foreground border border-secondary/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_6px_18px_rgba(11,53,89,0.12)] hover:brightness-[1.03] active:brightness-[0.98]",
    outline: "border border-[color:var(--panel-border)] bg-[color:var(--panel)] text-[color:var(--panel-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_12px_rgba(11,53,89,0.08)] hover:brightness-[1.02]",
    ghost: "border border-transparent bg-transparent text-foreground hover:bg-primary/10",
    link: "text-primary underline-offset-4 hover:underline"
  }

  const sizes = {
    default: "h-12 px-6 py-2",
    sm: "h-10 px-4",
    lg: "h-14 px-8",
    icon: "size-12 rounded-full"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold uppercase tracking-[0.08em] transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&_svg]:pointer-events-none [&_svg]:size-4 shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

export { Button }
