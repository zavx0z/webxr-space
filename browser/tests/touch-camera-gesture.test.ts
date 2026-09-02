import {expect, test} from "bun:test"
import {applyTouchCameraGesture} from "../src/touch-camera-gesture.ts"
import {claimTouchCameraSurface} from "../src/touch-camera-surface.ts"

test("[BRW-010] один touch orbit и два touch pan+pinch сохраняют исходный camera law", () => {
  const calls: unknown[][] = []
  const target = {
    orbit: (...values: number[]) => calls.push(["orbit", ...values]),
    pan: (...values: number[]) => calls.push(["pan", ...values]),
    zoom: (delta: number, anchor?: {clientX: number; clientY: number}) =>
      calls.push(["zoom", delta, anchor]),
  }

  expect(applyTouchCameraGesture(
    target,
    [{pointerId: 1, clientX: 10, clientY: 20}],
    [{pointerId: 1, clientX: 14, clientY: 26}],
  )).toBe(true)
  expect(calls).toEqual([["orbit", 4, 6]])

  calls.length = 0
  expect(applyTouchCameraGesture(
    target,
    [
      {pointerId: 1, clientX: 0, clientY: 0},
      {pointerId: 2, clientX: 10, clientY: 0},
    ],
    [
      {pointerId: 1, clientX: 2, clientY: 2},
      {pointerId: 2, clientX: 14, clientY: 2},
    ],
  )).toBe(true)
  expect(calls).toEqual([
    ["zoom", 2, {clientX: 8, clientY: 2}],
    ["pan", -3, -2],
  ])
})

test("[BRW-011] touch surface lifecycle восстанавливает touchAction и gesture listener", () => {
  const listeners = new Map<string, EventListener>()
  const canvas = {
    style: {touchAction: "manipulation"},
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      listeners.set(type, listener as EventListener)
    },
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
      if (listeners.get(type) === listener) listeners.delete(type)
    },
  }
  const release = claimTouchCameraSurface(canvas)
  expect(canvas.style.touchAction).toBe("none")
  expect(listeners.has("gesturestart")).toBe(true)

  let prevented = false
  listeners.get("gesturestart")?.({
    cancelable: true,
    preventDefault() {
      prevented = true
    },
  } as Event)
  expect(prevented).toBe(true)

  release()
  expect(canvas.style.touchAction).toBe("manipulation")
  expect(listeners.has("gesturestart")).toBe(false)
})
