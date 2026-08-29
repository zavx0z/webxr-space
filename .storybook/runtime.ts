import {workerProtocolCss} from "../dom/worker-protocol.ts"
import {createNodesExternalRuntime} from "../../../.storybook/runtime.ts"

export const runtime = createNodesExternalRuntime([workerProtocolCss])
