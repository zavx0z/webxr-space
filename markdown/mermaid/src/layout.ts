import {createCubicLinkRoute, type LinkPathPoint, type LinkRoute} from "@webxr/nodes/link"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutTopDown} from "@nodes/layout/top-down"
import type {MermaidGraph} from "../types/graph.ts"
import type {GraphMeasurement} from "@webxr/nodes/view"

/**
Строит план {@link @webxr/nodes/view#GraphView | GraphView} из разобранного графа и фактических измерений нод.
Горизонтальные схемы используют fixed layout, вертикальные — contour TopDown;
RL/BT отражают координаты, сохраняя идентификаторы графа.

@param graph - Нормализованный {@link MermaidGraph} без координат.

@param measurements - Измерения {@link GraphMeasurement} в CSS px с id из graph.nodes.
Ширина и высота должны быть конечными и строго положительными. Helper проверяет
наличие записи для каждой ноды, а недопустимые размеры отклоняют вызываемые
{@link layoutFixed} и {@link layoutTopDown} со своими ограничениями числового плана.

@returns Размеры области, прямоугольники нод и маршруты связей в координатах CSS px.

@throws Error, если для хотя бы одной ноды нет измерения; ошибки проверки входа
числовыми layout-функциями передаются вызывающему коду.

@example
```ts
const graph: MermaidGraph = {
  direction: "TB",
  nodes: [{id: "A", label: "Начало", shape: "rectangle"}],
  edges: [],
}
const plan = layoutMermaidGraph(graph, [
  {id: "A", width: 120, height: 60, anchors: []},
])
```
*/
export function layoutMermaidGraph(graph: MermaidGraph, measurements: readonly GraphMeasurement[]) {
  const horizontal = graph.direction === "LR" || graph.direction === "RL"
  const reverse = graph.direction === "RL" || graph.direction === "BT"
  const dimensions = graph.nodes.map(node => {
    const measured = measurements.find(value => value.id === node.id)
    if (measured === undefined) throw new Error(`Нода ${node.id} ещё не измерена`)
    return {id: node.id, width: measured.width, height: measured.height}
  })
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
    : layoutTopDown({
      attachment: "contour",
      nodes: dimensions.map(node => {
        const shape = graph.nodes.find(value => value.id === node.id)!.shape
        // Фактический CSS contour всех круглых Pane — эллипс. После pre-paint
        // стабилизации квадратного bbox он совпадает с circle без ручных размеров.
        return {...node, shape: shape === "rectangle" ? "rectangle" as const : "ellipse" as const}
      }),
      edges: graph.edges.map(edge => ({
        id: edge.id,
        sourceNodeId: edge.from,
        targetNodeId: edge.to,
        startInset: edge.startArrow ? 4 : 0,
        endInset: edge.endArrow ? 4 : 0,
      })),
      layoutOptions: {nodeSpacing: 50, layerSpacing: 50, padding: 8},
    })
  /**
  Отражает точку плана относительно bounds для RL/BT; остальные направления сохраняет.
  Входные и выходные координаты заданы в CSS px локальной области графа.

  @param value - Конечные координаты {@link LinkPathPoint} из полученного плана; helper их не валидирует.

  @returns Новая точка в том же масштабе после отражения требуемой оси.
  */
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
      })), {start: graph.edges.find(value => value.id === edge.id)!.startArrow ? 8 : 4, end: graph.edges.find(value => value.id === edge.id)!.endArrow ? 8 : 4})
    } else {
      const section = edge.sections[0]!
      route = {kind: "orthogonal", points: [section.startPoint, ...section.bendPoints, section.endPoint].map(point)}
    }
    return [edge.id, route] as const
  }))
  return {
    width: result.bounds.x + result.bounds.width,
    height: result.bounds.y + result.bounds.height,
    nodes: graph.nodes.map(node => {
      const rect = result.nodes.find(entry => entry.id === node.id)!
      const position = point({x: rect.x + (reverse && horizontal ? rect.width : 0), y: rect.y + (reverse && !horizontal ? rect.height : 0)})
      return {...node, rect: {...rect, ...position}}
    }),
    edges: graph.edges.map(edge => ({...edge, route: routes.get(edge.id)!})),
  }
}
