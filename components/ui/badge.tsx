import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'pink' | 'yellow' | 'blue'
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-black text-white',
    pink: 'bg-neo-pink text-white',
    yellow: 'bg-neo-yellow text-black',
    blue: 'bg-neo-blue text-white',
  }

  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1 font-black text-sm",
        "border-2 border-black",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
