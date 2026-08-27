import type {Document} from "@zavx0z/dom"
import type {ParameterDomRoute} from "./parameter-dom-data.ts"
import type {SocketDomRoute} from "./socket-dom-data.ts"
import {
  createParameterSocketStory,
  type ParameterSocketStory,
} from "./parameter-socket-story.ts"

export type ParameterSocketDomRoute = ParameterDomRoute | SocketDomRoute

export async function createParameterSocketRouteStory(
  document: Document,
  route: ParameterSocketDomRoute,
): Promise<ParameterSocketStory> {
  if (route === "ui/parameter" || route.startsWith("ui/parameter/")) {
    const {createParameterDomProps} = await import("./parameter-dom-data.ts")
    return createParameterSocketStory(document, createParameterDomProps(route as ParameterDomRoute))
  }
  if (route === "ui/socket" || route.startsWith("ui/socket/")) {
    const {createSocketDomProps} = await import("./socket-dom-data.ts")
    return createParameterSocketStory(document, createSocketDomProps(route as SocketDomRoute))
  }
  throw new Error(`Unknown Parameter/Socket DOM route: ${String(route)}`)
}
