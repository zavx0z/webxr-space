import {defineOwnerStory, withStoryProps} from "../story-types.ts"

export const story_basic_default = defineOwnerStory("components/data/table/basic/default", async (document) => {
  const {createCompiledTableProductionStory} = await import("../compiled/compiled-data-production-stories.tsx")
  const props = {
    "columns": [
      {
        "key": "name",
        "label": "Имя"
      },
      {
        "key": "type",
        "label": "Type"
      },
      {
        "key": "status",
        "label": "Состояние"
      }
    ],
    "rows": [
      {
        "key": "input",
        "cells": {
          "name": "Input",
          "type": "Surface",
          "status": "Ready"
        }
      },
      {
        "key": "output",
        "cells": {
          "name": "Output",
          "type": "Surface",
          "status": "Active"
        }
      }
    ],
    "selectedKey": "output",
    "title": "Table"
  } as const
  return withStoryProps(createCompiledTableProductionStory(document, props), props)
})
