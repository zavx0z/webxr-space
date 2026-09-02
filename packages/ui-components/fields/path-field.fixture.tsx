import {useState} from "@zavx0z/react"
import {PathField} from "./path-field.tsx"

export function PathFieldFixture() {
  const [value, setValue] = useState("/out")
  return <PathField label="Path" value={value} onInput={setValue} onBrowse={() => {}} />
}
