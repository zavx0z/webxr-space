import {DisplayElement} from "@zavx0z/dom/display"
import {
  readSpaceTree,
} from "@zavx0z/space"
import {HUDElement} from "@zavx0z/dom/hud"
import {Button} from "@zavx0z/ui/buttons/button"
import {Pane} from "@zavx0z/ui/surfaces/pane"
import {createRoot, useState} from "@zavx0z/component"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode,
} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

type ExperienceSpaceUiAcceptanceProps = Readonly<{
  label: string
}>

type ExperienceSpaceUiProjection = "display" | "hud"

const acceptanceProps: ExperienceSpaceUiAcceptanceProps = Object.freeze({
  label: "UI внутри общего Display",
})

function ExperienceSpaceUiAcceptance(props: ExperienceSpaceUiAcceptanceProps) {
  const [selected, setSelected] = useState(false)
  return <Pane
    active={selected}
    title="Один Experience / Document / Canvas / Space / ViewPoint"
    style={css`
      width: 240px;
    `}
  >
    <Button
      label={selected ? "Выбрано" : props.label}
      selected={selected}
      onClick={() => setSelected(value => !value)}
    />
  </Pane>
}

export function createCompiledExperienceDisplayUiAcceptanceStory(
  document: SemanticDocument,
): RoutedProductionComponentStory {
  return createCompiledExperienceSpaceUiAcceptanceStory(document, "display")
}

export function createCompiledExperienceHudUiAcceptanceStory(
  document: SemanticDocument,
): RoutedProductionComponentStory {
  return createCompiledExperienceSpaceUiAcceptanceStory(document, "hud")
}

function createCompiledExperienceSpaceUiAcceptanceStory(
  document: SemanticDocument,
  projection: ExperienceSpaceUiProjection,
): RoutedProductionComponentStory {
  const tree = readHostSpaceTree(document)
  if (tree.space.ownerDocument !== document ||
    tree.viewPoint.ownerDocument !== document) {
    throw new Error("Storybook Experience must own one Space and one ViewPoint in the supplied Document")
  }
  if (projection === "display" && tree.displays.length === 0) {
    throw new Error("UI display acceptance requires a host-owned @zavx0z/dom/display DisplayElement")
  }
  if (projection === "hud" && tree.hud === null) {
    throw new Error("UI HUD acceptance requires a host-owned @zavx0z/dom/hud HUDElement")
  }

  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(ExperienceSpaceUiAcceptance as any, acceptanceProps)
  const owner = staging.firstElementChild as SemanticHTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error("Experience Space UI acceptance story mounted no UI owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-acceptance", `experience-${projection}-ui`)

  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props: acceptanceProps,
      get source() {
        return Object.freeze({
          html: serialize(owner),
          typescript: acceptanceSource(projection),
        })
      },
      afterPresent() {
        assertProjectionOwner(owner, projection, document, tree)
      },
      dispose() {
        root.unmount()
      },
    }),
  })
}

function assertProjectionOwner(
  owner: SemanticHTMLElement,
  projection: ExperienceSpaceUiProjection,
  document: SemanticDocument,
  expectedTree: ReturnType<typeof readSpaceTree>,
): void {
  const tree = readHostSpaceTree(document)
  if (owner.ownerDocument !== document || !owner.isConnected ||
    tree.space !== expectedTree.space || tree.viewPoint !== expectedTree.viewPoint) {
    throw new Error("UI acceptance presentation must preserve the supplied Document, Space and ViewPoint")
  }
  let ancestor = owner.parentElement
  while (ancestor !== null) {
    if (projection === "display" && ancestor instanceof DisplayElement && tree.displays.includes(ancestor)) return
    if (projection === "hud" && ancestor instanceof HUDElement && tree.hud?.element === ancestor) return
    ancestor = ancestor.parentElement
  }
  throw new Error(`UI acceptance owner is not mounted inside the host ${projection}`)
}

function readHostSpaceTree(document: SemanticDocument): ReturnType<typeof readSpaceTree> {
  try {
    return readSpaceTree(document)
  } catch (cause) {
    throw new Error(
      "UI acceptance requires the Storybook host to use one @zavx0z/browser Experience with native Space and ViewPoint elements",
      {cause},
    )
  }
}

function acceptanceSource(projection: ExperienceSpaceUiProjection): string {
  const projectionCheck = projection === "display"
    ? [
        '  const projection = container.closest("display")',
        "  if (!tree.displays.some(element => element === projection)) {",
        '    throw new Error("Expected a host-owned Display")',
        "  }",
      ]
    : [
        '  const projection = container.closest("hud")',
        "  if (tree.hud === null || tree.hud.element !== projection) {",
        '    throw new Error("Expected a host-owned HUD")',
        "  }",
      ]
  return [
    'import type {HTMLElement} from "@zavx0z/dom"',
    'import {readSpaceTree} from "@zavx0z/space"',
    'import {Button} from "@zavx0z/ui/buttons/button"',
    'import {Pane} from "@zavx0z/ui/surfaces/pane"',
    'import {createRoot, useState} from "@zavx0z/component"',
    "",
    "function Acceptance() {",
    "  const [selected, setSelected] = useState(false)",
    "  return (",
    "    <Pane active={selected}>",
    "      <Button",
    '        label={selected ? "Выбрано" : "UI внутри общего Display"}',
    "        selected={selected}",
    "        onClick={() => setSelected(value => !value)}",
    "      />",
    "    </Pane>",
    "  )",
    "}",
    "",
    "// Контейнер предоставляет host внутри существующей проекции своего Document.",
    "export function mountAcceptance(container: HTMLElement) {",
    "  const document = container.ownerDocument",
    '  if (document === null) throw new Error("Expected the host Document")',
    "  // readSpaceTree проверяет единственную сцену и камеру; Space может находиться в body.",
    "  const tree = readSpaceTree(document)",
    "  if (tree.space.ownerDocument !== document || tree.viewPoint.ownerDocument !== document) {",
    '    throw new Error("Expected the host-owned Space and ViewPoint")',
    "  }",
    ...projectionCheck,
    "  const root = createRoot(container)",
    "  root.render(<Acceptance />)",
    "  return root",
    "}",
  ].join("\n")
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort()
    .map(name => ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
