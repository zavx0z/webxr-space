import {afterEach, beforeEach, describe, expect, test} from "bun:test"
import {createHeadless, type Headless} from "../index.ts"
import {TextBox} from "../fixtures/elements.tsx"

describe("статический JSX", () => {
  let headless: Headless

  beforeEach(() => {
    headless = createHeadless({width: 320, height: 180, styleSheetSources: []})
  })

  afterEach(async () => {
    await headless.dispose()
  })

  const scenarioElement = (
    <TextBox
      text="Статический JSX"
    />
  )

  test("[HEADLESS-STATIC-JSX] статический компонент монтируется из одного JSX-аргумента", async () => {
    const element = await headless.render(scenarioElement)

    expect(element.isConnected).toBe(true)
    expect(element.localName).toBe("article")
    expect(element.textContent).toBe("Статический JSX")
  })
})
