import {expect, test} from "bun:test"
import {usingBatchSession} from "../batch/src/session.ts"

test("batch создаёт одну session и закрывает её после успеха", async () => {
  let created = 0
  let closed = 0
  const result = await usingBatchSession(
    () => ({
      close: () => { closed += 1 },
      id: ++created,
    }),
    async session => [session.id, session.id],
  )
  expect(result).toEqual([1, 1])
  expect({created, closed}).toEqual({created: 1, closed: 1})
})

test("batch закрывает общую session после ошибки operation", async () => {
  let closed = 0
  await expect(usingBatchSession(
    () => ({close: () => { closed += 1 }}),
    async () => { throw new Error("analysis failed") },
  )).rejects.toThrow("analysis failed")
  expect(closed).toBe(1)
})
