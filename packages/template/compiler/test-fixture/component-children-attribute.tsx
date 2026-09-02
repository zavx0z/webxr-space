import {Child, Pane} from "./component-children.tsx"

export function AttributeChildren() {
  return <Pane children={<Child label="Attribute" />} />
}
