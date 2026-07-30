import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold tracking-[0.01em] outline-none transition-all duration-200 ease-out active:translate-y-0 active:scale-[0.98] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 [&_svg:not([class*='size-'])]:size-4 focus-visible:ring-[3px] focus-visible:ring-moto-orange/35 focus-visible:ring-offset-2 focus-visible:ring-offset-moto-dark aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      variant: {
        default:
          "border border-amber-200/20 bg-gradient-to-r from-moto-orange via-orange-400 to-amber-300 text-moto-darker shadow-[0_8px_22px_-10px_rgba(255,122,26,0.9)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_28px_-10px_rgba(255,122,26,0.95)] hover:[&_svg]:translate-x-0.5",
        destructive:
          "border border-red-400/20 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_8px_20px_-12px_rgba(239,68,68,0.9)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_12px_24px_-12px_rgba(239,68,68,0.95)] focus-visible:ring-destructive/30 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-white/15 bg-white/[0.035] text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm hover:-translate-y-0.5 hover:border-moto-orange/55 hover:bg-moto-orange/10 hover:text-white hover:shadow-[0_8px_22px_-14px_rgba(255,122,26,0.75)]",
        secondary:
          "border border-white/10 bg-moto-gray text-white shadow-sm hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10",
        ghost:
          "text-gray-300 hover:bg-white/[0.07] hover:text-moto-orange",
        link: "rounded-lg text-moto-orange underline-offset-4 shadow-none hover:text-amber-300 hover:underline",
        premium:
          "border border-amber-200/35 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 text-amber-950 shadow-[0_8px_24px_-10px_rgba(251,191,36,0.95)] hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_12px_30px_-10px_rgba(251,191,36,1)] hover:[&_svg]:rotate-6",
      },
      size: {
        default: "min-h-11 px-4 py-2.5 has-[>svg]:px-3",
        sm: "min-h-10 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "min-h-12 rounded-2xl px-6 text-base has-[>svg]:px-4",
        icon: "size-11",
        "icon-sm": "size-10",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
