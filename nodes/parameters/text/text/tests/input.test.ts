import {expect, test} from "bun:test"
import {InputEvent, type HTMLInputElement} from "@zavx0z/dom"
import {mountParameterStory} from "../../../shared/tests/story-fixture.ts"

test("[PARAMETERS-TEXT-INPUT] authored and projected input update the canonical Store without replacing controls", async () => {
  for (const variant of ["field", "projected"]) {
    const mounted = await mountParameterStory("text", variant)
    try {
      const input = mounted.owner.querySelector("input") as HTMLInputElement
      input.value = "Изменено"
      input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "Изменено", inputType: "insertText"}))
      await Promise.resolve()
      expect(mounted.owner.querySelector('[aria-label="Значение Parameter"]')?.textContent).toBe('"Изменено"')
      expect(mounted.owner.querySelector('[aria-label="Версия Parameter"]')?.textContent).toBe("revision: 1")
      expect(mounted.owner.querySelector("input")).toBe(input)
    } finally {
      mounted.dispose()
    }
  }
})
