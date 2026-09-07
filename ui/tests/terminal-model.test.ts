import {expect, test} from "bun:test"
import {createTerminalModel} from "../terminal-model.ts"

test("generic terminal preserves streaming ANSI colors, cursor replies and UTF-8 chunks", () => {
  const replies: string[] = []
  const model = createTerminalModel({onReply: data => replies.push(data)})
  model.write("plain \x1b[31")
  model.write("mred\x1b[0m\r\nnext")
  expect(model.toText()).toBe("plain red\nnext")
  expect(model.snapshot.lines[0]?.runs).toEqual([{text: "plain "}, {text: "red", color: "#ff5a5f"}])
  model.write("\x1b[6n\x1b[5n\x1b[c")
  expect(replies).toEqual(["\x1b[2;5R", "\x1b[0n", "\x1b[?1;2c"])
  model.setQueryMode("none")
  model.write("\x1b[6n")
  expect(replies).toHaveLength(3)
  model.clear()
  const utf8 = new TextEncoder().encode("Привет")
  model.write(utf8.slice(0, 3))
  model.write(utf8.slice(3))
  expect(model.toText()).toBe("Привет")
})

test("scrollback is bounded, surviving output lines retain identity, and subscriptions release", () => {
  const model = createTerminalModel({maxLines: 3})
  model.write("0\r\n1\r\n2")
  const survivor = model.snapshot.lines[2]!
  let changes = 0
  const release = model.subscribe(() => { changes++ })
  model.write("\r\n3\r\n4")
  expect(model.toText()).toBe("2\n3\n4")
  expect(model.snapshot.lines.map(line => line.id)).toEqual(["2", "3", "4"])
  expect(model.snapshot.lines[0]).toBe(survivor)
  expect(Object.isFrozen(model.snapshot.lines)).toBe(true)
  expect(changes).toBe(1)
  release()
  model.clear()
  expect(changes).toBe(1)
  expect(model.toText()).toBe("")
})

test("terminal cursor moves, erases and SGR reset use one retained text state", () => {
  const model = createTerminalModel()
  model.write("abcdef\rXY\x1b[K")
  expect(model.toText()).toBe("XY")
  model.write("\x1b[2J\x1b[1;44mZ\x1b[0m!")
  expect(model.snapshot.lines[0]?.runs).toEqual([{text: "Z", background: "#4aa3ff", bold: true}, {text: "!"}])
  model.write("\r\x1b[2Kdone")
  expect(model.toText()).toBe("done")
})
