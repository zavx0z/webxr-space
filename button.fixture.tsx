import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {Button} from "./button.tsx"
import {runIcon} from "./icons.ts"

export type ButtonDedupFixtureProps = Readonly<{
  ids: readonly string[]
}>

export function ButtonDedupFixture(props: ButtonDedupFixtureProps) {
  return <div>{props.ids.map(id => <Button key={id} label={id} />)}</div>
}

export const document = createDocument()
export const host = document.createElement("main")
document.appendChild(host)
export const root = createRoot(host)

root.render(<Button
  label="Output"
  iconSrc={runIcon}
  iconPosition="start"
  title="Output"
/>)
