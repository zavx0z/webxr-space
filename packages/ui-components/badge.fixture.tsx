import {Badge, type BadgeProps} from "./badge.tsx"

export type BadgeFixtureProps = BadgeProps

export function BadgeFixture(props: BadgeFixtureProps) {
  return <Badge label={props.label} tone={props.tone} title={props.title} style={props.style} />
}
