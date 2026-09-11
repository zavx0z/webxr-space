import {expect, test} from "bun:test"
import {markdownDestinations} from "../index.ts"

test("контракт адресов сохраняет порядок, устраняет повторы и не разрешает относительные пути", () => {
  const output = markdownDestinations({source: [
    "[Первый](./one.md)",
    "",
    "> ![Изображение](./image.png)",
    "",
    "- [Повтор](./one.md)",
    "- [Внешний](https://example.com/)",
    "",
    '<img src="javascript:alert(1)">',
  ].join("\n")})
  expect(output.destinations).toEqual(["./one.md", "./image.png", "https://example.com/"])
  expect(Object.isFrozen(output)).toBe(true)
  expect(Object.isFrozen(output.destinations)).toBe(true)
  expect(markdownDestinations({source: ""})).toEqual({destinations: []})
  const sourceWithExtraBase = {source: "[Документ](./guide.md)", baseUrl: "https://example.com/"}
  expect(markdownDestinations(sourceWithExtraBase).destinations).toEqual(["./guide.md"])
})

test("нестроковой исходник отклоняется тем же parser до обхода ресурсов", () => {
  expect(() => markdownDestinations({source: 42 as unknown as string})).toThrow(TypeError)
})
