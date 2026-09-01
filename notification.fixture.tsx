import type {Event} from "@zavx0z/dom"
import {useState} from "@zavx0z/react"
import {Notification, type NotificationProps} from "./notification.tsx"

export type NotificationFixtureProps = NotificationProps

export function NotificationFixture(props: NotificationFixtureProps) {
  const [dismissed, setDismissed] = useState(false)
  const onDismiss = (event: Event) => {
    setDismissed(true)
    props.onDismiss?.(event)
  }
  return <Notification
    message={dismissed ? "Dismissed" : props.message}
    heading={props.heading}
    detail={props.detail}
    tone={props.tone}
    dismissible={props.dismissible}
    title={props.title}
    style={props.style}
    onDismiss={onDismiss}
  />
}
