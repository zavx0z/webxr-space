import { Actor } from "./everywhere-everything/actor.js"
import { meta } from "./nodes/node.js"

class MetaXR extends HTMLElement {
  constructor() {
    super()
    this.builder = Actor.fromSchema({
      meta,
      id: "root-builder",
      context: { path: "1" },
      core: {
        field: Actor.field,
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

if (!customElements.get("everywhere-everything")) customElements.define("everywhere-everything", MetaXR)
