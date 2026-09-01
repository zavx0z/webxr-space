import {uiIcons} from "@ui/components/icons"
import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_value_selected = defineOwnerStory("components/controls/collection-control/value/selected", async (document) => {
  const {createCompiledCollectionControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [
      {
        "id": "input",
        "label": "Input",
        "iconSrc": uiIcons.log,
        "description": "Input surface"
      },
      {
        "id": "output",
        "label": "Output",
        "iconSrc": uiIcons.run,
        "description": "Output surface"
      },
      {
        "id": "viewport",
        "label": "Viewport",
        "iconSrc": uiIcons.visibilityOn,
        "description": "Viewport surface"
      }
    ],
    "selectedId": "output",
    "visibleRows": 3,
    "density": "regular",
    "title": "Collection"
  } as const
  return withStoryProps(createCompiledCollectionControlProductionStory(document, props), props)
})

export const story_value_empty = defineOwnerStory("components/controls/collection-control/value/empty", async (document) => {
  const {createCompiledCollectionControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [],
    "selectedId": null,
    "visibleRows": 3,
    "density": "regular",
    "title": "Collection"
  } as const
  return withStoryProps(createCompiledCollectionControlProductionStory(document, props), props)
})

export const story_state_disabled = defineOwnerStory("components/controls/collection-control/state/disabled", async (document) => {
  const {createCompiledCollectionControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [
      {
        "id": "input",
        "label": "Input",
        "description": "Input surface"
      },
      {
        "id": "output",
        "label": "Output",
        "description": "Output surface"
      },
      {
        "id": "viewport",
        "label": "Viewport",
        "description": "Viewport surface"
      }
    ],
    "selectedId": "output",
    "visibleRows": 3,
    "density": "regular",
    "title": "Collection",
    "disabled": true
  } as const
  return withStoryProps(createCompiledCollectionControlProductionStory(document, props), props)
})

export const story_state_readonly = defineOwnerStory("components/controls/collection-control/state/readonly", async (document) => {
  const {createCompiledCollectionControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [
      {
        "id": "input",
        "label": "Input",
        "description": "Input surface"
      },
      {
        "id": "output",
        "label": "Output",
        "description": "Output surface"
      },
      {
        "id": "viewport",
        "label": "Viewport",
        "description": "Viewport surface"
      }
    ],
    "selectedId": "output",
    "visibleRows": 3,
    "density": "regular",
    "title": "Collection",
    "readOnly": true
  } as const
  return withStoryProps(createCompiledCollectionControlProductionStory(document, props), props)
})

export const story_density_compact = defineOwnerStory("components/controls/collection-control/density/compact", async (document) => {
  const {createCompiledCollectionControlProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "items": [
      {
        "id": "input",
        "label": "Input",
        "description": "Input surface"
      },
      {
        "id": "output",
        "label": "Output",
        "description": "Output surface"
      },
      {
        "id": "viewport",
        "label": "Viewport",
        "description": "Viewport surface"
      }
    ],
    "selectedId": "output",
    "visibleRows": 3,
    "density": "compact",
    "title": "Collection"
  } as const
  return withStoryProps(createCompiledCollectionControlProductionStory(document, props), props)
})
