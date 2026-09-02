import {Child, Stack} from "./component-children.tsx"

export function UnkeyedChildren() {
  return <Stack>
    <Child label="First" />
    <Child label="Second" />
  </Stack>
}
