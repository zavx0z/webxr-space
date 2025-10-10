import { Actor } from "./everywhere-everything/actor.js"
import { meta } from "./nodes/node-builder.js"

class MetaXR extends HTMLElement {
  constructor() {
    super()
    this.builder = Actor.fromSchema({
      meta,
      id: "-0",
      context: {
        path: [0],
      },
      core: {
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
