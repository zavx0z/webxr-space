import {describe, expect, test} from "bun:test"
import {
  createDocument,
  Event,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLSelectElement,
  HTMLOptionElement,
  Text,
} from "@zavx0z/dom"
import {
  createField,
  FIELD_KINDS,
  fieldCss,
  type FieldColor,
  type FieldDefinition,
} from "./field.ts"

const textDefinition = {id: "name", label: "Name", kind: "text", value: "Output", placeholder: "Node name"} satisfies FieldDefinition
const numberDefinition = {id: "gain", label: "Gain", kind: "number", value: 0.5, min: 0, max: 1, step: 0.1} satisfies FieldDefinition
const integerDefinition = {id: "iterations", label: "Iterations", kind: "integer", value: 3, min: 0, max: 10} satisfies FieldDefinition
const booleanDefinition = {id: "enabled", label: "Enabled", kind: "boolean", value: true} satisfies FieldDefinition
const enumDefinition = {id: "mode", label: "Mode", kind: "enum", value: "output", options: [
  {value: "preview", label: "Preview"},
  {value: "output", label: "Output"},
]} satisfies FieldDefinition
const colorDefinition = {id: "tint", label: "Tint", kind: "color", value: {r: 0.1, g: 0.2, b: 0.3, a: 1}} satisfies FieldDefinition
const vectorDefinition = {id: "location", label: "Location", kind: "vector", value: [1, 2, 3], axes: ["X", "Y", "Z"]} satisfies FieldDefinition
const rotationDefinition = {id: "rotation", label: "Rotation", kind: "rotation", value: [0, 0, 0], axes: ["X", "Y", "Z"]} satisfies FieldDefinition
const matrixDefinition = {id: "transform", label: "Transform", kind: "matrix", value: [[1, 0], [0, 1]]} satisfies FieldDefinition
const referenceDefinition = {id: "material", label: "Material", kind: "reference", value: {id: "mat", label: "Material.001"}} satisfies FieldDefinition
const collectionDefinition = {id: "layers", label: "Layers", kind: "collection", selectedId: "front", items: [
  {id: "front", label: "Front"},
  {id: "back", label: "Back"},
]} satisfies FieldDefinition
const pathDefinition = {id: "path", label: "Path", kind: "path", value: "/output/image.png"} satisfies FieldDefinition
const readonlyDefinition = {id: "status", label: "Status", kind: "readonly", value: "Ready"} satisfies FieldDefinition
const definitions = [
  textDefinition,
  numberDefinition,
  integerDefinition,
  booleanDefinition,
  enumDefinition,
  colorDefinition,
  vectorDefinition,
  rotationDefinition,
  matrixDefinition,
  referenceDefinition,
  collectionDefinition,
  pathDefinition,
  readonlyDefinition,
] as const satisfies readonly FieldDefinition[]

describe("final production DOM Field", () => {
  test("creates the complete final union with one stable standard label association", () => {
    expect(FIELD_KINDS).toEqual([
      "text", "number", "integer", "boolean", "enum", "color", "vector",
      "rotation", "matrix", "reference", "collection", "path", "readonly",
    ])
    expect(definitions.map(({kind}) => kind)).toEqual([...FIELD_KINDS])

    for (const definition of definitions) {
      const controller = createField(createDocument(), definition)
      const {root, label, labelText, control, primary, controlId, labelId} = controller.refs
      expect(controller.element).toBe(root)
      expect(root).toBeInstanceOf(HTMLDivElement)
      expect(root.getAttribute("data-field-id")).toBe(definition.id)
      expect(root.getAttribute("data-field-kind")).toBe(definition.kind)
      expect(label).toBeInstanceOf(HTMLLabelElement)
      expect(labelText).toBeInstanceOf(Text)
      expect(labelText.data).toBe(definition.label)
      expect(label.id).toBe(labelId)
      expect(label.htmlFor).toBe(controlId)
      expect(label.control).toBe(primary)
      expect(primary.id).toBe(controlId)
      expect(root.childNodes).toEqual([label, control])
    }
  })

  test("keeps scalar values controlled while consuming native input/change activation", () => {
    const document = createDocument()
    const textValues: string[] = []
    const numberValues: number[] = []
    const integerValues: number[] = []
    const booleanValues: boolean[] = []
    const events: string[] = []
    const text = createField(document, {...definitions[0]!, onChange: (value: string) => textValues.push(value)})
    const number = createField(document, {
      id: "gain",
      label: "Gain",
      kind: "number",
      presentation: "slider",
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      onChange: (value) => numberValues.push(value),
    })
    const integer = createField(document, {...definitions[2]!, onChange: (value: number) => integerValues.push(value)})
    const boolean = createField(document, {...definitions[3]!, onChange: (value: boolean) => booleanValues.push(value)})
    const host = document.createElement("div")
    document.appendChild(host)
    host.append(text.element, number.element, integer.element, boolean.element)
    host.addEventListener("input", ({target}) => events.push(`input:${(target as HTMLInputElement).getAttribute("name") ?? "group"}`))
    host.addEventListener("change", ({target}) => events.push(`change:${(target as HTMLInputElement).getAttribute("name") ?? "group"}`))

    const textInput = text.refs.primary as HTMLInputElement
    textInput.value = "Live"
    textInput.dispatchEvent(new Event("input", {bubbles: true}))
    const numberInput = number.refs.primary as HTMLInputElement
    numberInput.valueAsNumber = 0.8
    numberInput.dispatchEvent(new Event("input", {bubbles: true}))
    const integerInput = integer.refs.primary as HTMLInputElement
    integerInput.valueAsNumber = 4.5
    integerInput.dispatchEvent(new Event("input", {bubbles: true}))
    integerInput.valueAsNumber = 4
    integerInput.dispatchEvent(new Event("input", {bubbles: true}))
    const checkbox = boolean.refs.primary as HTMLInputElement
    checkbox.click()

    expect(textValues).toEqual(["Live"])
    expect(numberValues).toEqual([0.8])
    expect(integerValues).toEqual([4])
    expect(booleanValues).toEqual([false])
    expect(events).toContain("input:name")
    expect(events).toContain("input:gain")
    expect(events).toContain("input:enabled")
    expect(events).toContain("change:enabled")
    expect(text.definition.kind === "text" && text.definition.value).toBe("Output")
    expect(boolean.definition.kind === "boolean" && boolean.definition.value).toBeTrue()

    text.update(text.definition)
    boolean.update(boolean.definition)
    expect(textInput.value).toBe("Output")
    expect(checkbox.checked).toBeTrue()
    expect(textValues).toHaveLength(1)
    expect(booleanValues).toHaveLength(1)
  })

  test("preserves keyed Enum options and reports the current native selection", () => {
    const values: string[] = []
    const controller = createField(createDocument(), {...definitions[4]!, onChange: (value: string) => values.push(value)})
    const select = controller.refs.control as HTMLSelectElement
    const preview = controller.refs.options.get("preview")!
    const output = controller.refs.options.get("output")!
    const previewText = preview.firstChild
    const outputText = output.firstChild

    controller.update({
      id: "mode",
      label: "Mode",
      kind: "enum",
      value: "preview",
      options: [
        {value: "output", label: "Final output", disabled: true},
        {value: "preview", label: "Live preview"},
        {value: "capture", label: "Capture"},
      ],
      onChange: (value) => values.push(value),
    })
    expect(controller.refs.options.get("preview")).toBe(preview)
    expect(controller.refs.options.get("output")).toBe(output)
    expect(preview).toBeInstanceOf(HTMLOptionElement)
    expect(preview.firstChild).toBe(previewText)
    expect(output.firstChild).toBe(outputText)
    expect(select.childNodes).toEqual([output, preview, controller.refs.options.get("capture")!])
    select.value = "capture"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(values).toEqual(["capture"])
    expect(controller.definition.kind === "enum" && controller.definition.value).toBe("preview")
  })

  test("retains keyed color, vector, rotation and matrix cells across controlled shape updates", () => {
    const colorValues: unknown[] = []
    const vectorValues: unknown[] = []
    const matrixValues: unknown[] = []
    const color = createField(createDocument(), {...definitions[5]!, onChange: (value: FieldColor) => colorValues.push(value)})
    const vector = createField(createDocument(), {...definitions[6]!, onChange: (value: readonly number[]) => vectorValues.push(value)})
    const rotation = createField(createDocument(), definitions[7]!)
    const matrix = createField(createDocument(), {...definitions[8]!, onChange: (value: readonly (readonly number[])[]) => matrixValues.push(value)})
    const colorR = color.refs.inputs.get("r")!
    const vectorX = vector.refs.inputs.get("0")!
    const matrix00 = matrix.refs.inputs.get("0:0")!

    colorR.valueAsNumber = 0.6
    colorR.dispatchEvent(new Event("input", {bubbles: true}))
    vectorX.valueAsNumber = 8
    vectorX.dispatchEvent(new Event("input", {bubbles: true}))
    matrix00.valueAsNumber = 2
    matrix00.dispatchEvent(new Event("input", {bubbles: true}))
    expect(colorValues).toEqual([{r: 0.6, g: 0.2, b: 0.3, a: 1}])
    expect(vectorValues).toEqual([[8, 2, 3]])
    expect(matrixValues).toEqual([[[2, 0], [0, 1]]])

    vector.update({id: "location", label: "Location", kind: "vector", value: [4, 5, 6, 7], axes: ["A", "B", "C", "D"]})
    matrix.update({id: "transform", label: "Transform", kind: "matrix", value: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]})
    expect(vector.refs.inputs.get("0")).toBe(vectorX)
    expect(vector.refs.inputs.size).toBe(4)
    expect(matrix.refs.inputs.get("0:0")).toBe(matrix00)
    expect(matrix.refs.inputs.size).toBe(9)
    expect(rotation.refs.inputs.size).toBe(3)

    expect(() => color.update({id: "tint", label: "Tint", kind: "color", value: {r: 2, g: 0, b: 0, a: 1}}))
      .toThrow("Color Field r must be from 0 to 1")
    expect(() => matrix.update({id: "transform", label: "Transform", kind: "matrix", value: [[1, 0], [0]]}))
      .toThrow("Matrix Field value must be square")
    expect(color.refs.inputs.get("r")).toBe(colorR)
    expect(matrix.refs.inputs.size).toBe(9)
  })

  test("routes reference, path and collection actions through current controlled callbacks", () => {
    const actions: string[] = []
    const reference = createField(createDocument(), {
      ...definitions[9]!,
      onActivate: () => actions.push("activate"),
      onPick: () => actions.push("pick"),
      onClear: () => actions.push("clear"),
    })
    const path = createField(createDocument(), {
      ...definitions[11]!,
      onChange: (value: string) => actions.push(`path:${value}`),
      onBrowse: () => actions.push("browse"),
    })
    const collection = createField(createDocument(), {
      ...definitions[10]!,
      onSelect: (id) => actions.push(`select:${id}`),
      onAdd: () => actions.push("add"),
      onRemove: (id) => actions.push(`remove:${id}`),
      onMove: (id, direction) => actions.push(`move:${id}:${direction}`),
    })
    const front = collection.refs.items.get("front")!
    const back = collection.refs.items.get("back")!
    const frontText = collection.refs.buttons.get("item:front")!.firstChild

    reference.refs.buttons.get("activate")!.click()
    reference.refs.buttons.get("pick")!.click()
    reference.refs.buttons.get("clear")!.click()
    const pathInput = path.refs.inputs.get("value")!
    pathInput.value = "/tmp/final.png"
    pathInput.dispatchEvent(new Event("input", {bubbles: true}))
    path.refs.buttons.get("browse")!.click()
    collection.refs.buttons.get("item:back")!.click()
    collection.refs.buttons.get("add")!.click()
    collection.refs.buttons.get("remove")!.click()
    collection.refs.buttons.get("down")!.click()
    expect(actions).toEqual([
      "activate", "pick", "clear", "path:/tmp/final.png", "browse",
      "select:back", "add", "remove:front", "move:front:down",
    ])

    collection.update({
      id: "layers",
      label: "Layers",
      kind: "collection",
      selectedId: "back",
      items: [{id: "back", label: "Rear"}, {id: "front", label: "Front renamed"}, {id: "fx", label: "FX"}],
      onSelect: (id) => actions.push(`next:${id}`),
    })
    expect(collection.refs.items.get("front")).toBe(front)
    expect(collection.refs.items.get("back")).toBe(back)
    expect(collection.refs.buttons.get("item:front")!.firstChild).toBe(frontText)
    expect(collection.refs.buttons.get("item:front")!.textContent).toBe("Front renamed")
    expect(collection.refs.items.size).toBe(3)
    collection.refs.buttons.get("item:front")!.click()
    expect(actions.at(-1)).toBe("next:front")

    const before = [...collection.refs.items.keys()]
    expect(() => collection.update({id: "layers", label: "Layers", kind: "collection", selectedId: "missing", items: [{id: "front", label: "Front"}]}))
      .toThrow("Collection Field selected item does not exist: missing")
    expect([...collection.refs.items.keys()]).toEqual(before)
  })

  test("blocks mutation controls in read-only state and removes owned listeners on dispose", () => {
    const values: string[] = []
    const document = createDocument()
    const controller = createField(document, {
      id: "path",
      label: "Path",
      kind: "path",
      value: "/one",
      readOnly: true,
      onChange: (value) => values.push(value),
      onBrowse: () => values.push("browse"),
    })
    const input = controller.refs.inputs.get("value")!
    expect(input.readOnly).toBeTrue()
    expect(controller.refs.buttons.get("browse")!.disabled).toBeTrue()
    input.value = "/two"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([])

    const definition = controller.definition
    const root = controller.element
    const host = document.createElement("div")
    document.appendChild(host)
    host.appendChild(root)
    expect(() => controller.update({...definition, id: "other"})).toThrow("Field id cannot change")
    expect(() => controller.update({id: "path", label: "Path", kind: "text", value: "other"})).toThrow("Field kind cannot change")
    controller.dispose()
    controller.dispose()
    input.value = "/three"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([])
    expect(root.parentNode).toBe(host)
    expect(() => controller.update(definition)).toThrow("Field controller is disposed")
  })

  test("publishes one exact DOM-only production leaf without aliasing the retained Field", async () => {
    const source = await Bun.file(new URL("./field.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("./dom/requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("./package.json", import.meta.url)).json() as {exports: Record<string, string>}
    expect(fieldCss).toContain(".ui-field")
    expect(fieldCss).toContain(".ui-field__matrix")
    expect(fieldCss).toContain('[aria-selected="true"]')
    expect(fieldCss).not.toContain("&")
    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "@engine/core", "@layout/core", "@ui/elements", "@ui/components",
      "@zavx0z/renderer", ["@zavx0z", "storybook"].join("/"), "UiSurface",
      "dispatchEvent", "labelStyle", "controlStyle", "field-stories", "-story.ts",
    ]) expect(source).not.toContain(forbidden)
    expect(source).not.toMatch(/\bsx\s*[?:=]/)
    expect(manifest.exports["./field"]).toBe("./field-component.tsx")
    expect(Object.keys(manifest.exports).some((key) => key.startsWith("./dom/"))).toBeFalse()
    expect(requirements).toContain("UI-DOM-FIELD-001")
    expect(requirements).toContain("text | number | integer")
    expect(requirements).toContain("reference | collection")
  })
})
