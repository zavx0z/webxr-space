import {createCubicLinkRoute, type LinkPathPoint, type LinkRoute} from "@webxr/nodes/link"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutTopDown} from "@nodes/layout/top-down"
import type {MermaidGraph} from "./parser.ts"
import type {GraphMeasurement} from "@webxr/nodes/view"

/** Передаёт измеренные размеры действующим алгоритмам; их политики не изменяет. */
export function layoutMermaidGraph(graph: MermaidGraph, measurements: readonly GraphMeasurement[]) {
  const horizontal = graph.direction === "LR" || graph.direction === "RL"
  const reverse = graph.direction === "RL" || graph.direction === "BT"
  const dimensions = graph.nodes.map(node => {
    const measured = measurements.find(value => value.id === node.id)
    if (measured === undefined) throw new Error(`Нода ${node.id} ещё не измерена`)
    return {id: node.id, width: measured.width, height: measured.height}
  })
  const ports = graph.edges.flatMap(edge => [
    {id: `${edge.id}/out`, nodeId: edge.from},
    {id: `${edge.id}/in`, nodeId: edge.to},
  ])
  const edges = graph.edges.map(edge => ({id: edge.id, sourcePortId: `${edge.id}/out`, targetPortId: `${edge.id}/in`}))
  const result = horizontal
    ? layoutFixed({
      viewport: {width: 1400, height: 700},
      nodes: dimensions,
      ports: dimensions.flatMap(node => [
        ...(graph.edges.some(edge => edge.from === node.id) ? [{id: `${node.id}/out`, nodeId: node.id, y: node.height / 2}] : []),
        ...(graph.edges.some(edge => edge.to === node.id) ? [{id: `${node.id}/in`, nodeId: node.id, y: node.height / 2}] : []),
      ]),
      edges: graph.edges.map(edge => ({id: edge.id, sourcePortId: `${edge.from}/out`, targetPortId: `${edge.to}/in`})),
      layoutOptions: {spacing: 32, layerSpacing: 96, padding: 24, clearance: 8},
    })
    : layoutTopDown({nodes: dimensions, ports: ports.map(port => ({...port, x: dimensions.find(node => node.id === port.nodeId)!.width / 2})), edges, layoutOptions: {nodeSpacing: 32, layerSpacing: 64, padding: 24}})
  const point = (value: LinkPathPoint): LinkPathPoint => ({
    x: reverse && horizontal ? 2 * result.bounds.x + result.bounds.width - value.x : value.x,
    y: reverse && !horizontal ? 2 * result.bounds.y + result.bounds.height - value.y : value.y,
  })
  const routes = new Map(result.edges.map(edge => {
    let route: LinkRoute
    if ("curves" in edge) {
      route = createCubicLinkRoute(edge.curves.map(curve => ({
        startPoint: point(curve.startPoint),
        controlPoints: [point(curve.controlPoints[0]), point(curve.controlPoints[1])] as const,
        endPoint: point(curve.endPoint),
      })))
    } else {
      const section = edge.sections[0]!
      route = {kind: "orthogonal", points: [section.startPoint, ...section.bendPoints, section.endPoint].map(point)}
    }
    return [edge.id, route] as const
  }))
  return {
    width: result.bounds.x + result.bounds.width + 24,
    height: result.bounds.y + result.bounds.height + 24,
    nodes: graph.nodes.map(node => {
      const rect = result.nodes.find(entry => entry.id === node.id)!
      const position = point({x: rect.x + (reverse && horizontal ? rect.width : 0), y: rect.y + (reverse && !horizontal ? rect.height : 0)})
      return {...node, rect: {...rect, ...position}}
    }),
    edges: graph.edges.map(edge => ({...edge, route: routes.get(edge.id)!})),
  }
}
