import {expect, test} from "bun:test"
import {
  NODE_MINIMUM_WIDTH,
  planNodeGeometry,
} from "../src/projection/metrics.ts"

test("[NODES-METRICS-001] пустая Node имеет фиксированную высоту и минимальную ширину", () => {
  const geometry = planNodeGeometry({width: 72, rows: []})

  expect(geometry.width).toBe(NODE_MINIMUM_WIDTH)
  expect(geometry.height).toBe(38)
  expect(geometry.contentHeight).toBe(38)
  expect(geometry.rows).toEqual([])
  expect(geometry.sockets).toEqual([])
})

test("[NODES-METRICS-002] количество строк однозначно задаёт высоту Node и центры Socket", () => {
  const geometry = planNodeGeometry({
    width: 160,
    rows: ["one", "two", "three"].map(id => ({socketIds: [id]})),
  })

  expect(geometry.width).toBe(160)
  expect(geometry.height).toBe(110)
  expect(geometry.rows.map(row => row.centerY)).toEqual([42, 67, 92])
  expect(geometry.sockets).toEqual([
    {id: "one", y: 42},
    {id: "two", y: 67},
    {id: "three", y: 92},
  ])
})

test("[NODES-METRICS-003] сложная строка сообщает свою числовую высоту без измерения DOM", () => {
  const geometry = planNodeGeometry({
    width: 180,
    rows: [
      {height: 28, socketIds: ["compact"]},
      {height: 46, spacingBefore: 5, socketIds: ["left", "right"]},
    ],
  })

  expect(geometry.height).toBe(120)
  expect(geometry.rows).toEqual([
    {index: 0, top: 31, height: 28, centerY: 45, socketIds: ["compact"]},
    {index: 1, top: 67, height: 46, centerY: 90, socketIds: ["left", "right"]},
  ])
  expect(geometry.sockets).toEqual([
    {id: "compact", y: 45},
    {id: "left", y: 90},
    {id: "right", y: 90},
  ])
})
