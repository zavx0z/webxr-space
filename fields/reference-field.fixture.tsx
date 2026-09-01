import {useState} from "@zavx0z/react"
import {ReferenceField, type ReferenceFieldValue} from "./reference-field.tsx"

export function ReferenceFieldFixture() {
  const [value, setValue] = useState<ReferenceFieldValue | null>({id: "a", label: "Alpha"})
  return <ReferenceField label="Target" value={value} onPick={() => setValue({id: "b", label: "Beta"})} onClear={() => setValue(null)} />
}
