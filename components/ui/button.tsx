import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'pink' | 'yellow' | 'blue' | 'default'
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      pink: 'bg-neo-pink hover:bg-[#e6005f]',
      yellow: 'bg-neo-yellow hover:bg-[#e5ab00]',
      blue: 'bg-neo-blue hover:bg-[#3378e5]',
      default: 'bg-neo-pink hover:bg-[#e6005f]',
    }

    return (
      <button
        className={cn(
          "inline-flex items-center justify-center font-black text-lg px-6 py-3",
          "border-4 border-black neo-shadow",
          "hover:neo-shadow-hover hover:translate-x-[2px] hover:translate-y-[2px]",
          "transition-all duration-150",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "active:neo-shadow-hover active:translate-x-[4px] active:translate-y-[4px]",
          variantStyles[variant],
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }
