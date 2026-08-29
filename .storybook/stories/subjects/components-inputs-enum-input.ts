import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_presentation_cycle = defineOwnerStory("components/inputs/enum-input/presentation/cycle", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/presentation/cycle"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_presentation_expanded = defineOwnerStory("components/inputs/enum-input/presentation/expanded", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/presentation/expanded"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_value_selected_description = defineOwnerStory("components/inputs/enum-input/value/selected-description", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/value/selected-description"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_value_header_icons = defineOwnerStory("components/inputs/enum-input/value/header-icons", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/value/header-icons"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_value_mixed_icons = defineOwnerStory("components/inputs/enum-input/value/mixed-icons", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/value/mixed-icons"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_value_invalid_legacy = defineOwnerStory("components/inputs/enum-input/value/invalid-legacy", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/value/invalid-legacy"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_exception_no_items = defineOwnerStory("components/inputs/enum-input/exception/no-items", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/exception/no-items"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_exception_menu_undefined = defineOwnerStory("components/inputs/enum-input/exception/menu-undefined", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/exception/menu-undefined"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_exception_menu_error = defineOwnerStory("components/inputs/enum-input/exception/menu-error", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/exception/menu-error"
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/inputs/enum-input/state/disabled", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/state/disabled",
    "disabled": true
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/inputs/enum-input/state/readonly", async (document) => {
  const {createCompiledEnumInputProductionStory} = await import("../compiled/compiled-enum-input-production-story.tsx")
  const props = {
    "value": "output",
    "options": [
      {
        "key": "input",
        "value": "input",
        "label": "Input"
      },
      {
        "key": "output",
        "value": "output",
        "label": "Output"
      },
      {
        "key": "viewport",
        "value": "viewport",
        "label": "Viewport"
      }
    ],
    "title": "components/inputs/enum-input/state/readonly",
    "disabled": true
  } as const
  return withStoryProps(createCompiledEnumInputProductionStory(document, props), props)
})
