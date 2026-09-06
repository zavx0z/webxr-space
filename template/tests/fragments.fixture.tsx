import {useEffect, useState} from "@zavx0z/component"

type Row = Readonly<{id: string; label: string}>
type RowProps = Readonly<{
  row: Row
  onDispose(id: string): void
}>

function FragmentRow(props: RowProps) {
  const [count, setCount] = useState(0)
  useEffect(() => () => props.onDispose(props.row.id), [])
  return <>
    <span data-label={props.row.id}>
      <>{props.row.label}<><b>!</b></></>
    </span>
    <button
      data-action={props.row.id}
      onClick={() => setCount(value => value + 1)}
    >
      {count}
    </button>
  </>
}

export function FragmentList(props: Readonly<{
  rows: readonly Row[]
  onDispose(id: string): void
}>) {
  return <section>
    {props.rows.map(row => <FragmentRow
      key={row.id}
      row={row}
      onDispose={props.onDispose}
    />)}
  </section>
}

export function TextFragment(props: Readonly<{value: string}>) {
  return <>{props.value}</>
}

export function EmptyFragment() {
  return <></>
}

export function FragmentInExpression(props: Readonly<{value: string}>) {
  return <p>{<>{props.value}<em>tail</em></>}</p>
}
