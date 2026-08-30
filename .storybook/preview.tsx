import type {Document, HTMLElement} from "@zavx0z/dom"
import {createRoot, type ComponentRoot} from "@zavx0z/react"

function EngineStorybookPreview() {
  return <section
    data-engine-storybook-preview=""
    aria-label="Живая сцена @engine/core"
    style={css`
      & {
        box-sizing: border-box;
        display: block;
        width: 100%;
        height: 100%;
        min-height: 220px;
        border: 1px solid #30343c;
        border-radius: 4px;
        background: transparent;
      }
    `}
  ></section>
}

export type EngineStorybookPreviewRoot = Readonly<{
  element: HTMLElement
  componentRoot: Pick<ComponentRoot, "readStyleSheets">
  dispose(): void
}>

export function createEngineStorybookPreview(
  document: Document,
): EngineStorybookPreviewRoot {
  const staging = document.createElement("div")
  const componentRoot = createRoot(staging)
  componentRoot.render(<EngineStorybookPreview />)
  const element = staging.querySelector("section") as HTMLElement | null
  if (element === null) {
    componentRoot.unmount()
    throw new Error("Engine Storybook preview mounted no semantic section")
  }
  staging.removeChild(element)
  return Object.freeze({
    element,
    componentRoot,
    dispose: () => componentRoot.unmount(),
  })
}
