import {describe, expect, test} from "bun:test"
import {SOCKET_KINDS} from "@nodes/ui/node"
import {
  createSocketOverviewStory,
  socketOverviewEntries,
} from "./socket-overview.ts"

describe("Socket owner overview stories", () => {
  test("shows every production Socket kind on the section overview", () => {
    expect(socketOverviewEntries().map(({kind}) => kind)).toEqual([...SOCKET_KINDS])
    const story = createSocketOverviewStory()
    expect(story.defaultArgs).toEqual({})
    expect(story.controls).toEqual([])
    const source = story.source({})
    expect(source.html).toContain('class="socket-overview"')
    expect(source.css).toContain(".socket-overview")
    expect(source.typescript).toContain("for (const kind of SOCKET_KINDS)")
    expect(source.typescript).toContain('from "@nodes/ui/node"')
  })

  test("shows all directions on a selected Socket kind overview", () => {
    expect(socketOverviewEntries("boolean").map(({kind, direction}) => ({kind, direction}))).toEqual([
      {kind: "boolean", direction: "input"},
      {kind: "boolean", direction: "output"},
      {kind: "boolean", direction: "bidirectional"},
    ])
    expect(createSocketOverviewStory("boolean").source({}).typescript).toContain('const kind = "boolean" as const')
  })
})
