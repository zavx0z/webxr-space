import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_text_default = defineOwnerStory("components/inputs/field/text/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-text",
    "label": "Value",
    "kind": "text",
    "value": "Output",
    "description": "Text value"
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_number_input = defineOwnerStory("components/inputs/field/number/input", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-number",
    "label": "Value",
    "kind": "number",
    "value": 42,
    "description": "Numeric value"
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_number_slider = defineOwnerStory("components/inputs/field/number/slider", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-slider",
    "label": "Коэффициент",
    "kind": "number",
    "presentation": "slider",
    "min": 0,
    "max": 1,
    "step": 0.01,
    "value": 0.5
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_integer_input = defineOwnerStory("components/inputs/field/integer/input", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-integer",
    "label": "Iterations",
    "kind": "integer",
    "value": 8,
    "description": "Iteration count"
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_boolean_switch = defineOwnerStory("components/inputs/field/boolean/switch", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-boolean",
    "label": "Enabled",
    "kind": "boolean",
    "presentation": "switch",
    "value": true
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_enum_default = defineOwnerStory("components/inputs/field/enum/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-enum",
    "label": "Mode",
    "kind": "enum",
    "value": "output",
    "options": [
      {
        "value": "input",
        "label": "Input"
      },
      {
        "value": "output",
        "label": "Output"
      },
      {
        "value": "viewport",
        "label": "Viewport"
      }
    ]
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_color_input = defineOwnerStory("components/inputs/field/color/input", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-color",
    "label": "Color",
    "kind": "color",
    "value": {
      "r": 0.2,
      "g": 0.55,
      "b": 0.8,
      "a": 1
    }
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_vector_default = defineOwnerStory("components/inputs/field/vector/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-vector",
    "label": "Location",
    "kind": "vector",
    "value": [
      1,
      2,
      3
    ],
    "axes": [
      "X",
      "Y",
      "Z"
    ]
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_rotation_default = defineOwnerStory("components/inputs/field/rotation/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-rotation",
    "label": "Вращение",
    "kind": "rotation",
    "value": [
      0,
      0,
      0
    ],
    "axes": [
      "X",
      "Y",
      "Z"
    ]
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_matrix_default = defineOwnerStory("components/inputs/field/matrix/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-matrix",
    "label": "Transform",
    "kind": "matrix",
    "value": [
      [
        1,
        0
      ],
      [
        0,
        1
      ]
    ]
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_reference_default = defineOwnerStory("components/inputs/field/reference/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-reference",
    "label": "Target",
    "kind": "reference",
    "value": {
      "id": "output",
      "label": "Output",
      "kind": "view"
    }
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_collection_default = defineOwnerStory("components/inputs/field/collection/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-collection",
    "label": "Items",
    "kind": "collection",
    "selectedId": "output",
    "items": [
      {
        "id": "input",
        "label": "Input"
      },
      {
        "id": "output",
        "label": "Output"
      },
      {
        "id": "viewport",
        "label": "Viewport"
      }
    ]
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_path_default = defineOwnerStory("components/inputs/field/path/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-path",
    "label": "File",
    "kind": "path",
    "value": "/project/output.exr"
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})

export const story_readonly_default = defineOwnerStory("components/inputs/field/readonly/default", async (document) => {
  const {createCompiledFieldProductionStory} = await import("../compiled/compiled-field-production-story.tsx")
  const props = {
    "id": "field-readonly",
    "label": "Result",
    "kind": "readonly",
    "value": "Output",
    "description": "Read-only result"
  } as const
  return withStoryProps(createCompiledFieldProductionStory(document, props), props)
})
