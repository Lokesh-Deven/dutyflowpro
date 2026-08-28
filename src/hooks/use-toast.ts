"use client"

import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

interface State {
  toasts: ToasterToast[]
}

type Toast = Omit<ToasterToast, "id">

// No-op toast implementation to stop showing toast notifications
function toast({ ...props }: Toast) {
  return {
    id: "",
    dismiss: () => {},
    update: () => {},
  }
}

function useToast() {
  const [state] = React.useState<State>({ toasts: [] })

  return {
    ...state,
    toast,
    dismiss: () => {},
  }
}

export { useToast, toast }
