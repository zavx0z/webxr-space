import type {Document} from "@zavx0z/dom"
import {
  createProductionNodeStory,
  type ProductionNodeStory,
} from "./production-node-story.tsx"

/** Exact external Storybook leaf for the canonical Core -> NodeTree component path. */
export function createNodeTreeStory(document: Document): ProductionNodeStory {
  return createProductionNodeStory(document, "ui/node-editor/scene/compiled-general")
}
