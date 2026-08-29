import {layoutPresentationCss} from "../dom/layout-presentation.ts"
import {createNodesExternalRuntime} from "../../../.storybook/runtime.ts"

export const runtime = createNodesExternalRuntime([layoutPresentationCss])
