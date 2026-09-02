import {expect, test} from "bun:test"
import {resolve} from "node:path"
import type {
  NodeJsonValue,
  ParameterSnapshot,
  Socket,
} from "@zavx0z/nodetree"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {ProjectedNodeSnapshot} from "../node.tsx"

const root = resolve(import.meta.dir, "../..")

Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")],
}))

const [
  {planProjectedNodeGeometry},
  {resolveProjectedParameterPresentation},
] = await Promise.all([
  import("../node.tsx"),
  import("../parameter.tsx"),
])

test("[NODES-PROJECTED-GEOMETRY-001] каждый простой Parameter имеет точную высоту своего UI-владельца", () => {
  const cases = [
    [parameter("checkbox", false), 60],
    [parameter("switch", false, undefined, {interaction: "switch"}), 60],
    [parameter("number", 1), 60],
    [parameter("slider", 1, undefined, {interaction: "slider", min: 0, max: 2}), 60],
    [parameter("text", "value"), 60],
    [parameter("select", "a", "enum"), 60],
    [parameter("cycle", "a", "enum", {interaction: "cycle"}), 60],
    [parameter("options", "a", "enum", {interaction: "option-group"}), 60],
    [parameter("path", "/tmp", "path"), 62],
    [parameter("reference", null, "material"), 62],
    [parameter("color", {r: 1, g: 1, b: 1, a: 1}, "color"), 66],
    [parameter("vector", [1, 2, 3], "vector"), 60],
    [parameter("output", []), 60],
  ] as const

  for (const [snapshot, expectedHeight] of cases) {
    expect(planProjectedNodeGeometry(node([snapshot])).height).toBe(expectedHeight)
  }
})

test("[NODES-PROJECTED-GEOMETRY-002] Matrix 2x2, 3x3 и 4x4 занимает фиксированное число компактных строк", () => {
  const matrices = [
    [matrix(2), 84],
    [matrix(3), 108],
    [matrix(4), 132],
  ] as const

  for (const [snapshot, expectedHeight] of matrices) {
    const geometry = planProjectedNodeGeometry(node([snapshot]))
    expect(geometry.height).toBe(expectedHeight)
    expect(geometry.rows[0]?.height).toBe(expectedHeight - 38)
  }
})

test("[NODES-PROJECTED-GEOMETRY-003] Collection читает visibleRows, а projected режим не выдумывает перемещение", () => {
  const rows = [
    [1, 96],
    [2, 96],
    [3, 122],
    [5, 174],
  ] as const

  for (const [visibleRows, expectedHeight] of rows) {
    const snapshot = parameter("collection", "a", "collection", {
      visibleRows,
      items: [{id: "a", label: "A"}],
    })
    const geometry = planProjectedNodeGeometry(node([snapshot]))
    expect(geometry.height).toBe(expectedHeight)
  }
})

test("[NODES-PROJECTED-GEOMETRY-004] связанный сложный Parameter схлопывается в одну Node-строку", () => {
  const snapshot = matrix(4)
  const socket = projectedSocket("matrix-input", "input", snapshot.id)
  const projected = node([snapshot], [socket])

  expect(planProjectedNodeGeometry(projected).height).toBe(132)
  expect(planProjectedNodeGeometry(
    projected,
    undefined,
    new Set(["node\u0000matrix-input"]),
  ).height).toBe(60)
})

test("[NODES-PROJECTED-GEOMETRY-005] spacingBefore входит в числовую геометрию отдельно от межстрочного зазора", () => {
  const first = parameter("first", 1, undefined, {spacingBefore: "small"})
  const second = parameter("second", 2, undefined, {spacingBefore: "medium"})
  const geometry = planProjectedNodeGeometry(node([first, second]))

  expect(geometry.height).toBe(91)
  expect(geometry.rows.map(row => ({top: row.top, centerY: row.centerY}))).toEqual([
    {top: 32, centerY: 43},
    {top: 62, centerY: 73},
  ])
})

test("[NODES-PROJECTED-GEOMETRY-006] port centers следуют точному порядку Node: loose right, Parameters, loose left", () => {
  const snapshot = matrix(2)
  const projected = node([snapshot], [
    projectedSocket("loose-left", "input"),
    projectedSocket("parameter-right", "output", snapshot.id),
    projectedSocket("loose-right", "output"),
    projectedSocket("parameter-left", "input", snapshot.id),
  ])
  const geometry = planProjectedNodeGeometry(projected, 180)

  expect(geometry.height).toBe(134)
  expect(geometry.rows.map(row => row.socketIds)).toEqual([
    ["node/loose-right"],
    ["node/parameter-right", "node/parameter-left"],
    ["node/loose-left"],
  ])
  expect(geometry.sockets).toEqual([
    {id: "node/loose-right", y: 42},
    {id: "node/parameter-right", y: 79},
    {id: "node/parameter-left", y: 79},
    {id: "node/loose-left", y: 116},
  ])

  const swapped = planProjectedNodeGeometry(
    projected,
    180,
    undefined,
    new Map([
      ["node\u0000loose-left", "right" as const],
      ["node\u0000loose-right", "left" as const],
    ]),
  )
  expect(swapped.rows.map(row => row.socketIds)).toEqual([
    ["node/loose-left"],
    ["node/parameter-right", "node/parameter-left"],
    ["node/loose-right"],
  ])
})

test("[NODES-PROJECTED-GEOMETRY-007] resolver выбирает ровно тот kind, который затем отрисовывается", () => {
  expect(resolveProjectedParameterPresentation(parameter(
    "incomplete-slider",
    1,
    undefined,
    {interaction: "slider", min: 0},
  )).kind).toBe("number")
  expect(resolveProjectedParameterPresentation(parameter(
    "options-without-value-type",
    "a",
    undefined,
    {options: [{key: "a", value: "a", label: "A"}]},
  )).kind).toBe("select")
  expect(resolveProjectedParameterPresentation(parameter(
    "collection-with-string-selection",
    "a",
    "collection",
    {items: [{id: "a", label: "A"}]},
  )).kind).toBe("collection")
  expect(resolveProjectedParameterPresentation(parameter(
    "reference-with-string-id",
    "material-a",
    "material",
  )).kind).toBe("reference")
})

function node(
  parameters: readonly ParameterSnapshot[],
  sockets: readonly Socket[] = [],
): ProjectedNodeSnapshot {
  return Object.freeze({
    id: "node",
    parameters: Object.freeze([...parameters]),
    sockets: Object.freeze([...sockets]),
  })
}

function parameter(
  id: string,
  value: NodeJsonValue,
  valueType?: string,
  presentation: NodeJsonValue = null,
): ParameterSnapshot {
  return Object.freeze({
    id,
    revision: 0,
    value,
    presentation,
    ...(valueType === undefined ? {} : {
      valueType: Object.freeze({id: valueType, version: 1}),
    }),
  })
}

function matrix(size: number): ParameterSnapshot {
  return parameter(
    `matrix-${size}`,
    Object.freeze(Array.from({length: size}, (_, row) =>
      Object.freeze(Array.from({length: size}, (_, column) => row === column ? 1 : 0)))),
    "matrix",
  )
}

function projectedSocket(
  id: string,
  direction: Socket["direction"],
  parameterId?: string,
): Socket {
  return Object.freeze({
    id,
    direction,
    ...(parameterId === undefined ? {} : {parameterId}),
  })
}
