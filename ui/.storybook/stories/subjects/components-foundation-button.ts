import {uiIcons} from "@zavx0z/ui/themes/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_text = defineOwnerStory("components/foundation/button/basic/text", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "text",
    "tone": "neutral",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_basic_contained = defineOwnerStory("components/foundation/button/basic/contained", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "neutral",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_basic_outlined = defineOwnerStory("components/foundation/button/basic/outlined", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "outlined",
    "tone": "neutral",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_icon_svg = defineOwnerStory("components/foundation/button/icon/svg", async (document) => {
  const {createCompiledIconButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    label: "Настройки",
    iconSrc: uiIcons.settings,
    variant: "text",
    tone: "neutral",
    size: "medium"
  } as const
  return withStoryProps(createCompiledIconButtonProductionStory(document, props), props)
})

export const story_icon_label_left = defineOwnerStory("components/foundation/button/icon-label/left", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    label: "Output",
    variant: "contained",
    tone: "neutral",
    size: "medium",
    startIcon: uiIcons.settings
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_icon_label_right = defineOwnerStory("components/foundation/button/icon-label/right", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    label: "Output",
    variant: "contained",
    tone: "neutral",
    size: "medium",
    endIcon: uiIcons.settings
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_sizes_small = defineOwnerStory("components/foundation/button/sizes/small", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "neutral",
    "size": "small"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_sizes_medium = defineOwnerStory("components/foundation/button/sizes/medium", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "neutral",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_sizes_large = defineOwnerStory("components/foundation/button/sizes/large", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "neutral",
    "size": "large"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_color_primary = defineOwnerStory("components/foundation/button/color/primary", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "primary",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_color_success = defineOwnerStory("components/foundation/button/color/success", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "success",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_color_warning = defineOwnerStory("components/foundation/button/color/warning", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "warning",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_color_error = defineOwnerStory("components/foundation/button/color/error", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "error",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})

export const story_color_neutral = defineOwnerStory("components/foundation/button/color/neutral", async (document) => {
  const {createCompiledButtonProductionStory} = await import("../compiled/compiled-button-production-story.tsx")
  const props = {
    "label": "Output",
    "variant": "contained",
    "tone": "neutral",
    "size": "medium"
  } as const
  return withStoryProps(createCompiledButtonProductionStory(document, props), props)
})
