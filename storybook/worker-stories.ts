import type {StorybookStoryModule} from "@zavx0z/storybook/stories"

export async function loadFixedWorkerStory(): Promise<StorybookStoryModule> {
  const {createFixedWorkerStory} = await import("./stories/fixed.ts")
  return createFixedWorkerStory()
}

export async function loadAdaptiveWorkerStory(): Promise<StorybookStoryModule> {
  const {createAdaptiveWorkerStory} = await import("./stories/adaptive.ts")
  return createAdaptiveWorkerStory()
}

export async function loadDagreLayeredWorkerStory(): Promise<StorybookStoryModule> {
  const {createDagreLayeredWorkerStory} = await import("./stories/dagre-layered.ts")
  return createDagreLayeredWorkerStory()
}

export async function loadCoffmanGrahamWorkerStory(): Promise<StorybookStoryModule> {
  const {createCoffmanGrahamWorkerStory} = await import("./stories/coffman-graham.ts")
  return createCoffmanGrahamWorkerStory()
}
