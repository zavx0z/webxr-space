import {
  readSpaceTree,
  XRDisplayElement,
  XRHUDElement,
} from "@zavx0z/space"
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
  if (tree.space !== document.documentElement ||
    tree.space.ownerDocument !== document ||
    tree.viewPoint.ownerDocument !== document) {
    throw new Error("Storybook Experience must own one Space and one ViewPoint in the supplied Document")
  }
  if (projection === "display" && tree.displays.length === 0) {
    throw new Error("UI display acceptance requires a host-owned @zavx0z/space Display")
  }
  if (projection === "hud" && tree.hud === null) {
    throw new Error("UI HUD acceptance requires a host-owned @zavx0z/space HUD")
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
        assertProjectionOwner(owner, projection)
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
): void {
  let ancestor = owner.parentElement
  while (ancestor !== null) {
    if (projection === "display" && ancestor instanceof XRDisplayElement) return
    if (projection === "hud" && ancestor instanceof XRHUDElement) return
    ancestor = ancestor.parentElement
  }
  throw new Error(`UI acceptance owner is not mounted inside the host ${projection}`)
}

function readHostSpaceTree(document: SemanticDocument): ReturnType<typeof readSpaceTree> {
  try {
    return readSpaceTree(document)
  } catch (cause) {
    throw new Error(
      "UI acceptance requires the Storybook host to use one @zavx0z/browser Experience with an @zavx0z/space root and ViewPoint",
      {cause},
    )
  }
}

function acceptanceSource(projection: ExperienceSpaceUiProjection): string {
  const projectionCheck = projection === "display"
    ? [
        "if (tree.displays.length === 0) {",
        '  throw new Error("Expected a host-owned Display")',
        "}",
      ]
    : [
        "if (tree.hud === null) {",
        '  throw new Error("Expected a host-owned HUD")',
        "}",
      ]
  return [
    'import {readSpaceTree} from "@zavx0z/space"',
    'import {Button} from "@zavx0z/ui/buttons/button"',
    'import {Pane} from "@zavx0z/ui/surfaces/pane"',
    'import {createRoot, useState} from "@zavx0z/component"',
    "",
    "// Fails closed until the external Storybook host uses @zavx0z/browser createExperience.",
    "const tree = readSpaceTree(document)",
    "if (tree.space !== document.documentElement || tree.viewPoint.ownerDocument !== document) {",
    '  throw new Error("Expected the host-owned Space and ViewPoint")',
    "}",
    ...projectionCheck,
    "// After presentation the same exact element must have the declared spatial owner.",
    "",
    "function Acceptance() {",
    "  const [selected, setSelected] = useState(false)",
    "  return <Pane active={selected}>",
    '    <Button label={selected ? "Выбрано" : "UI внутри общего Display"}',
    "      selected={selected}",
    "      onClick={() => setSelected(value => !value)}",
    "    />",
    "  </Pane>",
    "}",
    "createRoot(container).render(<Acceptance />)",
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
