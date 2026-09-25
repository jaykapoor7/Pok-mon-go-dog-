"use client"

import { useTheme } from "@/components/theme/ThemeProvider"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  /* sonner's own "system" mode reads window.matchMedia inside a useState
     initializer during render, not an effect: server always sees no window
     and picks "light", so a client whose OS prefers dark diverges on the
     very first hydration pass and throws a hydration-mismatch error. Our
     ThemeProvider already resolves the real theme safely (boot script sets
     the class before paint, the provider syncs from it in an effect), so
     passing its concrete value here means sonner's vulnerable "system"
     branch is never reached. */
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
