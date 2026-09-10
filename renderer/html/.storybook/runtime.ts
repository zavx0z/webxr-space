import type {Document, Element} from "@zavx0z/dom"

type Context = {
  document: Document
  present(value: {
    protocol: "story-presentation/1"
    node: Element
    componentRoot: {readStyleSheets(): {revision: number; styleSheets: readonly never[]}}
    source: {html: string; typescript: string}
    values: Record<string, never>
  }): void
}

export const geometry = Object.freeze({route: "vector/fill/geometry"})

/** Generic DOM fixture рисуется тем же Experience; runtime не создаёт Renderer или Canvas. */
export const runtime = Object.freeze({
  protocol: "storybook-runtime/4",
  create(context: Context) {
    let element: Element | null = null
    const unmount = () => {
      element?.remove()
      element = null
    }
    const mount = () => {
      unmount()
      const root = context.document.createElement("div")
      element = root
      root.setAttribute("aria-label", "Generic vector fill evidence")
      root.setAttribute("style", "position:relative;width:480px;height:240px;background:#202020")
      const sources: string[] = []
      const path = (parent: Element, name: string, d: string, style: string) => {
        const node = context.document.createElement("vector-path")
        node.d = d
        node.setAttribute("aria-label", name)
        node.setAttribute("style", `position:absolute;width:0;height:0;stroke-width:0;${style}`)
        parent.append(node)
        sources.push(`<vector-path d="${d}" style="${node.getAttribute("style")}" />`)
      }
      path(root, "Красный fill-only triangle", "M 15 15 L 95 55 L 15 95", "fill:#ff0000")
      path(root, "Зелёный вогнутый контур с белой обводкой", "M 125 15 L 205 15 L 205 40 L 150 40 L 150 95 L 125 95 L 125 15", "fill:#00ff00;stroke:#ffffff;stroke-width:3")
      path(root, "Синяя Q кривая", "M 235 15 Q 315 15 315 95 L 235 95", "fill:#0088ff")
      path(root, "Жёлтый evenodd контур с отверстием", "M 345 15 L 435 15 L 435 95 L 345 95 L 345 15 L 365 35 L 415 35 L 415 75 L 365 75 L 365 35 L 345 15", "fill:#ffff00;fill-rule:evenodd")
      const clip = context.document.createElement("div")
      clip.setAttribute("style", "position:absolute;left:15px;top:130px;width:80px;height:75px;overflow:hidden;background:#444444")
      root.append(clip)
      path(clip, "Оранжевая заливка scale и clip", "M 5 5 L 75 25 L 5 45", "fill:#ff8800;transform-origin:0 0;transform:scale(2)")
      path(root, "Только белая обводка", "M 130 135 L 205 170 L 130 205 L 130 135", "fill:none;stroke:#ffffff;stroke-width:3")
      path(root, "Полупрозрачная пурпурная C кривая", "M 240 170 C 240 115 320 115 320 170 C 320 225 240 225 240 170", "fill:#ff00ff;opacity:0.5")
      path(root, "Скрытый контур", "M 350 140 L 430 170 L 350 200", "fill:#ffffff;visibility:hidden")
      context.present({
        protocol: "story-presentation/1",
        node: root,
        componentRoot: {readStyleSheets: () => ({revision: 0, styleSheets: []})},
        source: {html: sources.join("\n"), typescript: "Generic semantic vector-path: fill, stroke, nonzero/evenodd, transform, clip, visibility"},
        values: {},
      })
    }
    return Object.freeze({mount, update: mount, unmount, dispose: unmount})
  },
})
