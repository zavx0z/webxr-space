import {describe, expect, test} from "bun:test"
import graph from "../graphs/ui-component-graph.json"
import type {UiComponentGraph} from "../scripts/ui-component-graph.ts"
import {loadUiGraphStories, matchUiGraphStory} from "./ui-story-adapter.ts"

const typedGraph = graph as unknown as UiComponentGraph

describe("webxr-space UI story adapter", () => {
  test("uses only exact API metadata and never substitutes a sibling export", () => {
    expect(match("@ui/components/pane#Pane")).toMatchObject({
      kind: "api-name",
      route: "pane/variants/glass",
    })
    expect(match("@ui/components/button#Button")).toMatchObject({
      kind: "api-name",
      route: "button/basic/contained",
    })
    expect(match("@ui/components/button#IconButton")).toBeNull()
    expect(match("@ui/components/pane#Paper")).toBeNull()
    expect(match("@ui/elements/list#ol")).toBeNull()
  })

  test("accepts an exact combined API name without leaf-name inference", () => {
    expect(match("@ui/elements/list#ul")).toMatchObject({
      index: {componentId: "list"},
    })
    expect(match("@ui/elements/text#h2")).toBeNull()
  })

  test("uses exact production adapters for public exports without stories", async () => {
    const subset: UiComponentGraph = {
      ...typedGraph,
      nodes: typedGraph.nodes.filter(({id}) => [
        "@ui/elements/control#control",
        "@ui/elements/text#h2",
        "@ui/elements/text#hr",
        "@ui/components/button#IconButton",
        "@ui/components/list#ListItem",
        "@ui/components/pane#Paper",
        "@ui/elements/list#ol",
      ].includes(id)),
      edges: [],
    }
    const previews = await loadUiGraphStories(subset)
    expect(previews.size).toBe(7)
    for (const preview of previews.values()) {
      expect(preview.match?.kind).toBe("direct-render")
      expect(preview.module).not.toBeNull()
      expect(preview.error).toBeNull()
    }
  })

  test("gives every graph node a renderer that owns the same export", async () => {
    const previews = await loadUiGraphStories(typedGraph)
    expect(previews.size).toBe(typedGraph.nodes.length)
    for (const node of typedGraph.nodes) {
      const preview = previews.get(node.id)
      expect(preview).toBeDefined()
      expect(preview!.error).toBeNull()
      expect(preview!.module).not.toBeNull()
      expect(preview!.match).not.toBeNull()
      if (preview!.match!.kind === "api-name") {
        expect(preview!.match!.index.apiName.split(/[\s/]+/)).toContain(node.exportName)
      } else {
        expect(preview!.module!.source(preview!.module!.defaultArgs)).toContain(node.exportName)
      }
    }
  })

  test("loads real lazy story modules with immutable default args", async () => {
    const subset: UiComponentGraph = {
      ...typedGraph,
      nodes: typedGraph.nodes.filter(({id}) => [
        "@ui/components/pane#Pane",
        "@ui/elements/div#div",
      ].includes(id)),
      edges: [],
    }
    const previews = await loadUiGraphStories(subset)
    for (const preview of previews.values()) {
      expect(preview.error).toBeNull()
      expect(preview.module).not.toBeNull()
      expect(Object.isFrozen(preview.module!.defaultArgs)).toBeTrue()
      expect(preview.module!.source(preview.module!.defaultArgs).trim().length).toBeGreaterThan(0)
    }
  })
})

function match(id: string) {
  const node = typedGraph.nodes.find((entry) => entry.id === id)
  if (node === undefined) throw new Error(`Missing graph node: ${id}`)
  return matchUiGraphStory(node)
}
