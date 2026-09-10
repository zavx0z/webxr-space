import {observeElementLayout, readElementLayoutRect} from "@zavx0z/dom/geometry"
import {normalizeLinkRoute} from "../routing/link-path.ts"
import type {GraphInput, GraphLayoutComputer, GraphMeasuredLayout, GraphMeasurement, GraphScene} from "./contracts.ts"

export type MeasuredGraphState = Readonly<{scene: GraphScene | null; pending: boolean; error: Error | null; generation: number}>

/** Один lifecycle измерения и layout на точную пару input/layout; модель не копируется. */
export function createMeasuredGraph(input: GraphInput, layout: GraphLayoutComputer) {
  const ids = new Set(input.nodes.map(node => node.id))
  if (ids.size !== input.nodes.length) throw new Error("GraphInput содержит повторный id ноды")
  let state: MeasuredGraphState = {scene: null, pending: true, error: null, generation: 0}
  const listeners = new Set<() => void>()
  let releases: (() => void)[] = []
  let active = false
  let version = 0
  let previous = ""
  const publish = (next: MeasuredGraphState) => {
    state = Object.freeze(next)
    for (const listener of [...listeners]) listener()
  }
  const read = (elements: ReadonlyMap<string, Element>): readonly GraphMeasurement[] | null => {
    const measurements: GraphMeasurement[] = []
    for (const node of input.nodes) {
      const element = elements.get(node.id)
      if (element === undefined) return null
      const rect = readElementLayoutRect(element)
      if (rect === null || rect.width <= 0 || rect.height <= 0) return null
      const anchors = []
      for (const anchor of node.anchors ?? []) {
        const target = element.querySelector(anchor.selector)
        if (target === null) return null
        const box = readElementLayoutRect(target, element)
        if (box === null) return null
        anchors.push(Object.freeze({id: anchor.id, x: box.x + box.width / 2, y: box.y + box.height / 2}))
      }
      measurements.push(Object.freeze({id: node.id, width: rect.width, height: rect.height, anchors: Object.freeze(anchors)}))
    }
    return Object.freeze(measurements)
  }
  const accept = (result: GraphMeasuredLayout, generation: number) => {
    if (!active || generation !== version) return
    const byId = new Map(result.nodes.map(node => [node.id, node]))
    if (byId.size !== result.nodes.length || byId.size !== input.nodes.length) throw new Error("Layout вернул другой состав нод")
    const scene: GraphScene = Object.freeze({
      bounds: Object.freeze({...result.bounds}),
      nodes: Object.freeze(input.nodes.map(node => {
        const rect = byId.get(node.id)
        if (rect === undefined || ![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) {
          throw new Error(`Некорректная геометрия ноды ${node.id}`)
        }
        return Object.freeze({...node, data: Object.hasOwn(rect, "data") ? rect.data : node.data,
          rect: Object.freeze({x: rect.x, y: rect.y, width: rect.width, height: rect.height})})
      })),
      links: Object.freeze(result.links.map(link => Object.freeze({...link,
        from: link.from === undefined ? undefined : Object.freeze({...link.from}),
        to: link.to === undefined ? undefined : Object.freeze({...link.to}),
        route: normalizeLinkRoute(link.route),
      }))),
      frames: Object.freeze((result.frames ?? []).map(frame => Object.freeze({...frame, rect: Object.freeze({...frame.rect})}))),
    })
    publish({scene, pending: false, error: null, generation})
  }
  const fail = (error: unknown, generation: number) => {
    if (active && generation === version) publish({...state, pending: true, error: error instanceof Error ? error : new Error(String(error))})
  }
  const update = (elements: ReadonlyMap<string, Element>) => {
    if (!active) return
    const measurements = read(elements)
    if (measurements === null) {
      if (!state.pending || previous !== "") {
        previous = ""
        version += 1
        publish({...state, pending: true, generation: version})
      }
      return
    }
    const key = JSON.stringify(measurements)
    if (key === previous) return
    previous = key
    const generation = ++version
    publish({...state, pending: true, error: null, generation})
    try {
      const result = layout(measurements)
      if (result !== null && typeof result === "object" && "then" in result) {
        Promise.resolve(result).then(value => accept(value, generation)).catch(error => fail(error, generation))
      } else {
        accept(result, generation)
      }
    } catch (error) { fail(error, generation) }
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    connect(elements: ReadonlyMap<string, Element>) {
      active = true
      const dispose = () => {
        active = false
        version += 1
        for (const release of releases) release()
        releases = []
      }
      try {
        for (const node of input.nodes) {
          const element = elements.get(node.id)
          if (element === undefined) throw new Error(`Представление ${node.id} не передало elementRef`)
          releases.push(observeElementLayout(element, () => update(elements)))
          for (const anchor of node.anchors ?? []) {
            const target = element.querySelector(anchor.selector)
            if (target === null) throw new Error(`Не найден anchor ${node.id}/${anchor.id}`)
            releases.push(observeElementLayout(target, () => update(elements), {relativeTo: element}))
          }
        }
        update(elements)
      } catch (error) {
        dispose()
        throw error
      }
      return dispose
    },
  }
}
