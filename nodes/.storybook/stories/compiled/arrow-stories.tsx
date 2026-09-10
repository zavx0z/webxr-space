import {createRoot} from "@zavx0z/component"
import type {Document} from "@zavx0z/dom"
import {Arrow} from "@webxr/nodes/markers/arrow"
import type {MarkerContext} from "@webxr/nodes/markers"
import {mountNodesStory} from "../mount.ts"

const context: MarkerContext = {
  ownerId: "arrow-example", side: "end", position: {x: 80, y: 95}, direction: {x: 1, y: 0},
  color: "#9e9e9e", strokeWidth: 2.2, selected: false, disabled: false, hidden: false,
}

function ArrowStory(props: Readonly<{variant: "open" | "filled"}>) {
  return <section
    aria-label="Маркер Arrow"
    style={css`
      display: flex;
      flex-direction: column;
      position: relative;
      width: 440px;
      height: 160px;
      padding: 16px;
      color: var(--widget-regular-content);
    `}
  >
    <p>Слева — обычный размер. Справа — length=80, width=60, offset=8.</p>
    <Arrow
      context={context}
      variant={props.variant}
    />
    <Arrow
      context={{...context, ownerId: "large-arrow", position: {x: 360, y: 95}}}
      variant={props.variant}
      length={80}
      width={60}
      offset={8}
    />
  </section>
}

export function createArrowStory(document: Document, route: string) {
  const variant = route.endsWith("/filled") ? "filled" : "open"
  const staging = document.createElement("div")
  const root = createRoot(staging)
  try {
    root.render(<ArrowStory variant={variant} />)
    return mountNodesStory(document, route, staging, root, [
      'import {Arrow} from "@webxr/nodes/markers/arrow"',
      'import type {MarkerContext} from "@webxr/nodes/markers"',
      `const context: MarkerContext = ${JSON.stringify(context, null, 2)}`,
      'export function Example() {',
      '  return <Arrow',
      '    context={context}',
      `    variant="${variant}"`,
      '  />',
      '}',
    ].join("\n"), {component: "Arrow", variant})
  } catch (error) {
    root.unmount()
    throw error
  }
}
