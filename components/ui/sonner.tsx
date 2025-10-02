"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast border-4 border-black neo-shadow-sm bg-white text-black font-bold",
          description: "text-gray-700",
          actionButton:
            "bg-neo-pink text-white border-2 border-black font-black",
          cancelButton:
            "bg-gray-200 text-black border-2 border-black font-bold",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
