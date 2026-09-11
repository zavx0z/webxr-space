import {describe, expect, test} from "bun:test"
import {parseMarkdown} from "../index.ts"
import {markdownDestinations} from "../../destinations/index.ts"

describe("shared Markdown parser", () => {
  test("parses GFM tables with inline content, escaped pipes, alignment and resource discovery", () => {
    const source = "| Left | Center | Right |\r\n| :--- | :---: | ---: |\r\n| a\\|b | [`code`](./doc.md) | ![image](./image.png) |\r\n| short |\r\n"
    const table = parseMarkdown({source}).blocks[0]
    if (table?.kind !== "table") throw new Error("Expected table")
    expect(table.head[0]?.cells.map(cell => cell.align)).toEqual(["left", "center", "right"])
    expect(table.body).toHaveLength(2)
    expect(table.body[0]?.cells[0]?.content[0]).toMatchObject({kind: "text", value: "a|b"})
    expect(table.body[1]?.cells).toHaveLength(3)
    expect(table.body[1]?.cells[2]?.content).toEqual([])
    expect(markdownDestinations({source}).destinations).toEqual(["./doc.md", "./image.png"])
    expect(Object.isFrozen(table.body[0]?.cells)).toBe(true)
    expect(parseMarkdown({source: "| just | text |\n| no delimiter | here |"}).blocks[0]?.kind).toBe("paragraph")
    expect(parseMarkdown({source: "```\n" + source + "\n```"}).blocks[0]?.kind).toBe("code")
  })
  test("recognizes code inside link labels, emphasis and safe raw HTML images", () => {
    const parsed = parseMarkdown({source: [
      '<div align="center"><img src="docs/img/metafor.gif" alt="Обзор" width="444" onerror="alert(1)"></div>',
      "",
      "**Жирный** и *курсив*, [`docs/README.md`](docs/README.md).",
    ].join("\n")})
    expect(parsed.blocks[0]).toMatchObject({kind: "group", align: "center"})
    const serialized = JSON.stringify(parsed)
    expect(serialized).toContain('"kind":"image"')
    expect(serialized).toContain('"width":444')
    expect(serialized).not.toContain("onerror")
    expect(serialized).toContain('"kind":"strong"')
    expect(serialized).toContain('"kind":"em"')
    expect(serialized).toContain('"kind":"code","value":"docs/README.md"')
  })

  test("preserves block order, CRLF code contents and relative links", () => {
    const parsed = parseMarkdown({source: "# Title\r\n\r\nText [link](./README.md)\r\n\r\n- one\r\n\r\n1. two\r\n\r\n```unknown\r\na\r\nb\r\n```"})
    expect(parsed.blocks.map(block => block.kind)).toEqual(["heading", "paragraph", "list", "list", "code"])
    expect(parsed.blocks[4]).toMatchObject({kind: "code", languageId: "unknown", value: "a\nb"})
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.blocks)).toBe(true)
    const paragraph = parsed.blocks[1]
    if (paragraph?.kind !== "paragraph") throw new Error("Expected paragraph")
    expect(paragraph.content[1]).toMatchObject({kind: "link", href: "./README.md"})
  })

  test("keeps a final unclosed code fence and empty input deterministic", () => {
    expect(parseMarkdown({source: "\n\r\n"}).blocks).toEqual([])
    expect(parseMarkdown({source: "```\nvalue"}).blocks[0]).toMatchObject({
      kind: "code", languageId: "plaintext", value: "value",
    })
  })
})
