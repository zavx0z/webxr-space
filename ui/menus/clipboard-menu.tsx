import {useSyncExternalStore} from "@zavx0z/component"
import {Menu} from "./menu.tsx"

/** Structural command port: UI has no Browser dependency or native clipboard access. */
export type ClipboardMenuController = Readonly<{
  getSnapshot(): Readonly<{
    open: boolean
    x: number
    y: number
    canCopy: boolean
    canPaste: boolean
    pending: boolean
    error: string | null
  }>
  subscribe(listener: () => void): () => void
  copy(): Promise<unknown>
  paste(): Promise<unknown>
  close(): void
}>

/** Mount once in the Experience HUD and supply its existing clipboard controller. */
export function ClipboardMenu(props: Readonly<{controller: ClipboardMenuController}>) {
  const state = useSyncExternalStore(props.controller.subscribe, props.controller.getSnapshot)
  return <Menu
    open={state.open}
    x={state.x}
    y={state.y}
    label="Буфер обмена"
    error={state.error}
    onClose={props.controller.close}
    items={[
      {key: "copy", label: "Копировать", shortcut: "⌘/Ctrl+C", disabled: !state.canCopy || state.pending,
        onSelect: () => { void props.controller.copy() }},
      {key: "paste", label: "Вставить", shortcut: "⌘/Ctrl+V", disabled: !state.canPaste || state.pending,
        onSelect: () => { void props.controller.paste() }},
    ]}
  />
}
