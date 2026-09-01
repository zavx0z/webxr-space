import {useState} from "@zavx0z/react"
import {Table, type TableProps} from "./table.tsx"

export type TableFixtureProps = Omit<TableProps, "selectedKeys" | "selectionAnchorKey" | "onSelectionChange">

export function TableFixture(props: TableFixtureProps) {
  const [selectedKey, setSelectedKey] = useState(props.selectedKey ?? null)
  const onRowActivate = (key: string, event: Event) => {
    setSelectedKey(key)
    props.onRowActivate?.(key, event)
  }
  return <Table
    columns={props.columns}
    rows={props.rows}
    selectedKey={selectedKey}
    disabled={props.disabled}
    title={props.title}
    style={props.style}
    onRowActivate={onRowActivate}
    isCellInteractive={props.isCellInteractive}
    onCellActivate={props.onCellActivate}
  />
}
