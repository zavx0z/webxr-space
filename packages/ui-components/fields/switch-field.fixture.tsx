import {useState} from "@zavx0z/react"
import {SwitchField} from "./switch-field.tsx"

export function SwitchFieldFixture() {
  const [checked, setChecked] = useState(false)
  return <SwitchField label="Active" checked={checked} onChange={setChecked} />
}
