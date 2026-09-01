import {useState} from "@zavx0z/react"
import {TextField} from "./text-field.tsx"

export function TextFieldFixture() {
  const [value, setValue] = useState("Alpha")
  return <TextField label="Name" value={value} onInput={setValue} />
}
