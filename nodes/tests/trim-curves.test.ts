import {expect, test} from "bun:test"
import {trimCubicCurves} from "../shared/routing/trim-curves.ts"

test("[LINK-ARC-TRIM] парабола x=t,y=t²: аналитическая длина до t=1/2", () => {
  const curve = {startPoint: {x: 0, y: 0}, controlPoints: [{x: 1 / 3, y: 0}, {x: 2 / 3, y: 1 / 3}] as const, endPoint: {x: 1, y: 1}}
  const length = (Math.sqrt(2) + Math.asinh(1)) / 4
  const result = trimCubicCurves([curve], length, 0)
  expect(result[0]!.startPoint.x).toBeCloseTo(.5, 7)
  expect(result[0]!.startPoint.y).toBeCloseTo(.25, 7)
  expect(result[0]!.endPoint).toEqual({x: 1, y: 1})
  expect(trimCubicCurves([curve], 10, 10)).toEqual([curve])
})
