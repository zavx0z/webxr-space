import {useState} from "@zavx0z/react"
import {NumberField} from "./number-field.tsx"

export function NumberFieldFixture() {
  const [value, setValue] = useState(1.5)
  return <NumberField label="Value" value={value} min={0} max={10} step={0.1} onInput={setValue} />
}
