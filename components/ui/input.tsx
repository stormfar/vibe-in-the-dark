import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-14 w-full px-4 py-2 font-bold text-lg",
          "border-4 border-black neo-shadow-sm",
          "bg-white placeholder:text-gray-500",
          "focus:outline-none focus:neo-shadow focus:translate-x-[-2px] focus:translate-y-[-2px]",
          "transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }
