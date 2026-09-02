import {useState} from "@zavx0z/react"
import {CollectionField, type CollectionFieldItem} from "./collection-field.tsx"

const items = Object.freeze([
  {id: "a", label: "Alpha"},
  {id: "b", label: "Beta"}
] satisfies readonly CollectionFieldItem[])

export function CollectionFieldFixture() {
  const [selectedId, setSelectedId] = useState<string | null>("a")
  return <CollectionField label="Items" items={items} selectedId={selectedId} onSelect={setSelectedId} />
}
