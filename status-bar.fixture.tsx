import {StatusBar, type StatusBarProps} from "./status-bar.tsx"

export type StatusBarFixtureProps = StatusBarProps

export function StatusBarFixture(props: StatusBarFixtureProps) {
  return <StatusBar
    start={props.start}
    end={props.end}
    separator={props.separator}
    title={props.title}
    style={props.style}
  />
}
