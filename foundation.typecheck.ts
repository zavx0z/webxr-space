import type {NodeTreeDocument} from "./node-tree.ts"

const empty = {order: [], byId: {}} as const

export const legacyDocument = {
  formatVersion: 1,
  frames: empty,
  nodes: empty,
  links: empty,
} satisfies NodeTreeDocument

export const foundationDocument = {
  formatVersion: 2,
  scopes: empty,
  frames: empty,
  nodes: empty,
  links: empty,
} satisfies NodeTreeDocument

// @ts-expect-error Format 1 cannot represent foundation collections.
export const invalidLegacyDocument: NodeTreeDocument = {
  formatVersion: 1,
  scopes: empty,
  frames: empty,
  nodes: empty,
  links: empty,
}

// @ts-expect-error Format 1 cannot represent foundation fields inside a Node.
export const invalidLegacyNodeDocument: NodeTreeDocument = {
  formatVersion: 1,
  frames: empty,
  nodes: {
    order: ["node"],
    byId: {
      node: {
        scopeId: "root",
        parameters: empty,
        sockets: empty,
      },
    },
  },
  links: empty,
}
