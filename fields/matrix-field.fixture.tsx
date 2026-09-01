import {useState} from "@zavx0z/react"
import {MatrixField} from "./matrix-field.tsx"

export function MatrixFieldFixture() {
  const [value, setValue] = useState<readonly (readonly number[])[]>([[1, 0], [0, 1]])
  return <MatrixField label="Matrix" value={value} onInput={setValue} />
}
