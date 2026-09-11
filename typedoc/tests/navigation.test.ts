import {expect, test} from "bun:test"
import {createDocument, DOMRect} from "@zavx0z/dom"
import {createTypeDocNavigation} from "../typedoc/src/navigation.ts"

test("верхнее видимое поле выбирается по своему содержимому, а не общей высоте родителя", () => {
  const document = createDocument()
  const viewport = document.createElement("div")
  const comment = document.createElement("section")
  const commentHeading = document.createElement("h4")
  const members = document.createElement("section")
  members.setAttribute("data-typedoc-members", "")
  const examples = document.createElement("section")
  const examplesHeading = document.createElement("h4")
  const examplesDescription = document.createElement("p")
  document.append(viewport)
  viewport.append(comment)
  comment.append(commentHeading, members)
  members.append(examples)
  examples.append(examplesHeading, examplesDescription)
  let scroll = 0
  viewport.getBoundingClientRect = () => new DOMRect(0, 100, 600, 300)
  comment.getBoundingClientRect = () => new DOMRect(0, -100 - scroll, 600, 800)
  commentHeading.getBoundingClientRect = () => new DOMRect(0, -90 - scroll, 600, 20)
  members.getBoundingClientRect = () => new DOMRect(0, 50 - scroll, 600, 600)
  examples.getBoundingClientRect = () => new DOMRect(0, 110 - scroll, 600, 250)
  examplesHeading.getBoundingClientRect = () => new DOMRect(0, 125 - scroll, 600, 20)
  examplesDescription.getBoundingClientRect = () => new DOMRect(0, 153 - scroll, 600, 100)
  const navigation = createTypeDocNavigation()
  navigation.register("Output", ["comment"], comment as unknown as HTMLElement)
  navigation.register("Output", ["comment", "examples"], examples as unknown as HTMLElement)
  for (scroll of [0, 20, 30, 20, 0]) {
    expect(navigation.handle.locate(viewport as unknown as Element))
      .toEqual({declaration: "Output", path: ["comment", "examples"]})
  }
  commentHeading.getBoundingClientRect = () => new DOMRect(0, 105, 600, 20)
  expect(navigation.handle.locate(viewport as unknown as Element))
    .toEqual({declaration: "Output", path: ["comment"]})
  navigation.dispose()
})
