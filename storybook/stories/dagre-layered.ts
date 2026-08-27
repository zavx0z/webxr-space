import {runTopDownWorkerRequest} from "@nodes/worker/top-down/executor"
import type {StorybookStoryModule} from "@zavx0z/storybook/stories"
import {DAGRE_LAYERED_WORKER_STORY_GRAPH} from "../fixtures/dagre-layered.ts"
import {defineWorkerProtocolStory} from "../worker-story.ts"

export function createDagreLayeredWorkerStory(): StorybookStoryModule {
  return defineWorkerProtocolStory({
    id: "dagre-layered",
    label: "Dagre Layered",
    executorImport: "@nodes/worker/top-down/executor",
    executorName: "runTopDownWorkerRequest",
    createRequest(generation): Parameters<typeof runTopDownWorkerRequest>[0] {
      return {
        type: "layout",
        requestId: generation,
        generation,
        graph: DAGRE_LAYERED_WORKER_STORY_GRAPH,
      }
    },
    execute: runTopDownWorkerRequest,
  })
}
