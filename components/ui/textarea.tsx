import * as React from "react"
import { cn } from "@/lib/utils"

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full px-4 py-3 font-medium text-base",
          "border-4 border-black neo-shadow-sm",
          "bg-white placeholder:text-gray-500",
          "focus:outline-none focus:neo-shadow focus:translate-x-[-2px] focus:translate-y-[-2px]",
          "transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "resize-none",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
