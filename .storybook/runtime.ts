import {nodesDomStoryCss} from "../storybook/dom/production-node-css.ts"
import {createNodesExternalRuntime} from "../../../.storybook/runtime.ts"

export const runtime = createNodesExternalRuntime([nodesDomStoryCss])
