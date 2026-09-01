import type {Event} from "@zavx0z/dom"
import {useState} from "@zavx0z/react"
import {List, type ListProps} from "./list.tsx"

export type ListFixtureProps = ListProps

export function ListFixture(props: ListFixtureProps) {
  const [selectedKey, setSelectedKey] = useState(props.selectedKey ?? null)
  const onSelect = (key: string, event: Event) => {
    setSelectedKey(key)
    props.onSelect?.(key, event)
  }
  return <List
    items={props.items}
    selectedKey={selectedKey}
    disabled={props.disabled}
    dense={props.dense}
    variant={props.variant}
    emptyLabel={props.emptyLabel}
    title={props.title}
    style={props.style}
    onSelect={onSelect}
  />
}
