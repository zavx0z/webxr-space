import {Button} from "./button.tsx"

export type ButtonDedupFixtureProps = Readonly<{
  ids: readonly string[]
}>

export function ButtonDedupFixture(props: ButtonDedupFixtureProps) {
  return <div>{props.ids.map(id => <Button key={id} label={id} />)}</div>
}
