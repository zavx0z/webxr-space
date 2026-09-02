import {useState} from "@zavx0z/react"
import {SelectField, type SelectFieldOption} from "./select-field.tsx"

const options = Object.freeze([
  {key: "a", value: "a", label: "Alpha"},
  {key: "b", value: "b", label: "Beta"}
] satisfies readonly SelectFieldOption[])

export function SelectFieldFixture() {
  const [value, setValue] = useState("a")
  return <SelectField label="Mode" value={value} options={options} onChange={setValue} />
}
