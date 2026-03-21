import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-5 text-black" />
        ),
        info: (
          <InfoIcon className="size-5 text-blue-500" />
        ),
        warning: (
          <TriangleAlertIcon className="size-5 text-amber-500" />
        ),
        error: (
          <OctagonXIcon className="size-5 text-rose-500" />
        ),
        loading: (
          <Loader2Icon className="size-5 text-zinc-400 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "white",
          "--normal-text": "rgb(9, 9, 11)",
          "--normal-border": "rgb(212, 212, 216)",
          "--border-radius": "1rem",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white dark:group-[.toaster]:bg-zinc-950 group-[.toaster]:text-zinc-950 dark:group-[.toaster]:text-zinc-50 group-[.toaster]:border-teal-600 dark:group-[.toaster]:border-teal-600 group-[.toaster]:!border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:px-5 group-[.toaster]:py-2 group-[.toaster]:gap-4 group-[.toaster]:font-sans group-[.toaster]:w-[320px] relative overflow-hidden",
          description: "group-[.toast]:text-zinc-700 dark:group-[.toast]:text-zinc-300 group-[.toast]:text-[13px] group-[.toast]:leading-relaxed",
          title: "group-[.toast]:font-semibold group-[.toast]:text-[15px] group-[.toast]:tracking-tight",
          actionButton:
            "group-[.toast]:bg-zinc-900 group-[.toast]:text-zinc-50 dark:group-[.toast]:bg-zinc-50 dark:group-[.toast]:text-zinc-900 group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:h-9 group-[.toast]:text-xs transition-all hover:group-[.toast]:scale-105 active:group-[.toast]:scale-95",
          cancelButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-600 dark:group-[.toast]:bg-zinc-800 dark:group-[.toast]:text-zinc-400 group-[.toast]:font-semibold group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:h-9 group-[.toast]:text-xs transition-all hover:group-[.toast]:bg-zinc-200 dark:hover:group-[.toast]:bg-zinc-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
