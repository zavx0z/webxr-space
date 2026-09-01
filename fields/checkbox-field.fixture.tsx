import {useState} from "@zavx0z/react"
import {CheckboxField} from "./checkbox-field.tsx"

export function CheckboxFieldFixture() {
  const [checked, setChecked] = useState(false)
  return <CheckboxField label="Enabled" checked={checked} onChange={setChecked} />
}
