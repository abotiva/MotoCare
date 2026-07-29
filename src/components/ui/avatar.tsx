import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  premium = false,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & { premium?: boolean }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-premium={premium || undefined}
      title={premium && !props.title ? "Miembro Premium" : props.title}
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
        premium && "border-2 border-lime-300 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-moto-darker shadow-[0_0_14px_rgba(163,230,53,0.45)]"
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
