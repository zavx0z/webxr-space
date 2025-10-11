import { Actor } from "./everywhere-everything/actor.js"
import { meta } from "./nodes/node-builder.js"

class MetaXR extends HTMLElement {
  constructor() {
    super()
    this.builder = Actor.fromSchema({
      meta,
      id: "root-builder",
      context: { path: "1" },
      core: {
        hierarchy: Actor.hierarchy,
        node: {
          tag: "meta-for",
          type: "meta",
          string: {
            src: "/meta/canvas.js",
          },
        },
      },
    })
  }
  connectedCallback() {}
}

if (!customElements.get("meta-xr")) customElements.define("meta-xr", MetaXR)
