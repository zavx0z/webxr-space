import {useState} from "@zavx0z/react"
import {VectorField} from "./vector-field.tsx"

export function VectorFieldFixture() {
  const [value, setValue] = useState<readonly number[]>([1, 2, 3])
  return <VectorField label="Location" value={value} onInput={setValue} />
}
