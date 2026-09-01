import {Divider, type DividerProps} from "./divider.tsx"

export type DividerFixtureProps = DividerProps

export function DividerFixture(props: DividerFixtureProps) {
  return <Divider variant={props.variant} title={props.title} style={props.style} />
}
