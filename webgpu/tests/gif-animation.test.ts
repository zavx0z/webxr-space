import {expect, test} from "bun:test"
import {GifAnimation, type GifDecoder} from "../src/gif-animation.ts"

function fixture(repetitionCount = Infinity) {
  let now = 0
  let observed = true
  let closes = 0
  let frameCloses = 0
  const frames: number[] = []
  const errors: unknown[] = []
  const timers = new Map<number, {callback: () => void; delay: number}>()
  let nextTimer = 0
  const decoder: GifDecoder = {
    tracks: {ready: Promise.resolve(), selectedTrack: {frameCount: 2, repetitionCount}},
    async decode({frameIndex}) {
      return {image: {
        duration: frameIndex === 0 ? 30_000 : 70_000,
        displayWidth: 2,
        displayHeight: 2,
        timestamp: frameIndex,
        close() { frameCloses++ },
      } as VideoFrame}
    },
    close() { closes++ },
  }
  const player = new GifAnimation({
    createDecoder: () => decoder,
    observed: () => observed,
    present: frame => { frames.push(frame.timestamp) },
    failed: error => { errors.push(error) },
    now: () => now,
    schedule(callback, delay) {
      timers.set(++nextTimer, {callback, delay})
      return nextTimer
    },
    cancel(timer) { timers.delete(Number(timer)) },
  })
  const settle = async () => { for (let i = 0; i < 5; i++) await Promise.resolve() }
  return {
    player, frames, timers, errors, decoder, settle,
    counts: () => ({closes, frameCloses}),
    advance(ms: number) { now += ms },
    hide() {
      observed = false
      player.pause()
    },
    show() {
      observed = true
      player.start()
    },
    unobserve() {
      observed = false
      player.stop()
    },
    async tick() {
      const [id, timer] = [...timers][0]!
      timers.delete(id)
      now += timer.delay
      timer.callback()
      await settle()
    },
  }
}

test("GIF respects frame durations and finite repetitions without duplicating timers", async () => {
  const f = fixture(1)
  f.player.start()
  f.player.start()
  await f.settle()
  expect(f.frames).toEqual([0])
  expect([...f.timers.values()].map(timer => timer.delay)).toEqual([30])
  await f.tick()
  expect(f.frames).toEqual([0, 1])
  expect([...f.timers.values()].map(timer => timer.delay)).toEqual([70])
  await f.tick()
  await f.tick()
  expect(f.frames).toEqual([0, 1, 0, 1])
  expect(f.timers.size).toBe(0)
  expect(f.counts()).toEqual({closes: 1, frameCloses: 4})
  f.player.start()
  await f.settle()
  expect(f.frames).toHaveLength(4)
  expect(f.errors).toEqual([])
})

test("removing the last observer closes the decoder and cancels scheduled work", async () => {
  const f = fixture()
  f.player.start()
  await f.settle()
  await f.tick()
  f.unobserve()
  expect(f.frames).toEqual([0, 1])
  expect(f.timers.size).toBe(0)
  expect(f.counts()).toEqual({closes: 1, frameCloses: 2})
})

test("a frame decoded after disposal is closed without being uploaded", async () => {
  const f = fixture()
  let finish!: (result: {image: VideoFrame}) => void
  let closed = false
  f.decoder.decode = () => new Promise(resolve => { finish = resolve })
  f.player.start()
  await f.settle()
  f.unobserve()
  finish({image: {close() { closed = true }} as VideoFrame})
  await f.settle()
  expect(closed).toBe(true)
  expect(f.frames).toEqual([])
  expect(f.timers.size).toBe(0)
  expect(f.errors).toEqual([])
})

test("visibility pause preserves the remaining delay, frame cursor and finite repeat count", async () => {
  const f = fixture(1)
  f.player.start()
  await f.settle()
  f.advance(10)
  f.hide()
  f.advance(1000)
  expect(f.timers.size).toBe(0)
  expect(f.frames).toEqual([0])
  expect(f.counts().closes).toBe(0)
  f.show()
  expect([...f.timers.values()].map(timer => timer.delay)).toEqual([20])
  await f.tick()
  expect(f.frames).toEqual([0, 1])
  await f.tick()
  f.hide()
  f.advance(900)
  f.show()
  await f.tick()
  expect(f.frames).toEqual([0, 1, 0, 1])
  expect(f.timers.size).toBe(0)
  expect(f.counts().closes).toBe(1)
})

test("rapid visibility changes keep one decode in flight and discard a hidden result", async () => {
  const f = fixture()
  const pending: Array<{index: number; finish: (result: {image: VideoFrame}) => void}> = []
  let closed = 0
  f.decoder.decode = ({frameIndex}) => new Promise(finish => { pending.push({index: frameIndex, finish}) })
  f.player.start()
  await f.settle()
  f.hide()
  f.show()
  f.hide()
  await f.settle()
  expect(pending).toHaveLength(1)
  const frame = {timestamp: 0, duration: 30_000, close() { closed++ }} as VideoFrame
  pending[0]!.finish({image: frame})
  await f.settle()
  expect(f.frames).toEqual([])
  expect(closed).toBe(1)
  f.show()
  await f.settle()
  expect(pending.map(value => value.index)).toEqual([0, 0])
  pending[1]!.finish({image: frame})
  await f.settle()
  expect(f.frames).toEqual([0])
  f.player.stop()
})
