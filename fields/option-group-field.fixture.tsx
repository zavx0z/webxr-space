import {useState} from "@zavx0z/react"
import {OptionGroupField, type OptionGroupFieldOption} from "./option-group-field.tsx"

const options = Object.freeze([
  {key: "a", value: "a", label: "Alpha"},
  {key: "b", value: "b", label: "Beta"}
] satisfies readonly OptionGroupFieldOption[])

export function OptionGroupFieldFixture() {
  const [value, setValue] = useState("a")
  return <OptionGroupField label="Mode" value={value} options={options} onChange={setValue} />
}
