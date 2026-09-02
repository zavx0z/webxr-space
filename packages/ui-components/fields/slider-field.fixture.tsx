import {useState} from "@zavx0z/react"
import {SliderField} from "./slider-field.tsx"

export function SliderFieldFixture() {
  const [value, setValue] = useState(0.5)
  return <SliderField label="Ratio" value={value} min={0} max={1} step={0.1} onInput={setValue} />
}
