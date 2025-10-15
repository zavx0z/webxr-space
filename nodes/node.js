/**
 * @typedef {import("metafor/metafor").NodeMeta} NodeMeta
 * @typedef {import("metafor/metafor").NodeType} NodeType
 * @typedef {import("metafor/metafor").NodeLogical} NodeLogical
 * @typedef {import("metafor/actor").Fields} Fields
 * @typedef {import("metafor/actor").Actor} Actor
 */

export const meta = MetaFor("node")
  .context((t) => ({
    type: t.enum("log", "meta", "map", "cond", "text", "el").optional({ label: "Тип элемента" }),
    tag: t.string.optional(),

    id: t.string.optional({ label: "Id сборщика" }),
    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    идентификация: {
      мета: { type: "meta", tag: { startsWith: "meta-" } },
      логический: { type: "log" },
      конец: { type: null },
    },
    мета: {
      конец: { type: null },
    },
    логический: {
      конец: { type: null },
    },
    конец: {},
  })
  .core({
    /** @type {NodeType|null} */
    node: null,
    /** @type {Actor|null} */
    builder: null,
  })
  .processes((process) => ({
    идентификация: process()
      .action(({ core }) => {
        if (!core.node) throw new Error("Нода не передана")
        if (Object.hasOwn(core.node, "tag")) {
          const node = /** @type {NodeMeta } */ (core.node)
          if (typeof node.tag === "string") return { type: node.type, tag: node.tag }
          else return { type: node.type }
        } else return { type: core.node.type }
      })
      .success(({ update, data }) => update(data))
      .error(({ error, update }) => update({ error: error.message })),
    мета: process()
      .action(async ({ self, core }) => {
        const [{ Actor }, { meta }] = await Promise.all([import("metafor/actor"), import("nodes/meta.js")])
        Actor.appendChild(self.actor, meta, { core: { node: core.node } })
      })
      .error(({ error, update }) => update({ error: error.message })),
    логический: process()
      .action(async ({ core, self }) => {
        if (!core.node) throw new Error("Нет родительского актора")
        const [{ Actor }, { meta }] = await Promise.all([import("metafor/actor"), import("nodes/logical.js")])
        Actor.appendChild(self.actor, meta, { core: { node: core.node } })
      })
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions((reaction) => [
    [
      ["мета", "логический"],
      reaction()
        .filter(({ context }) => ({
          actor: /** @type {string} */ (context.id),
          path: "/state",
          op: "replace",
          value: "ожидание",
        }))
        // .equal(({ self }) => {}),
        .equal(({ self }) => self.destroy(false)),
    ],
  ])
  .view()
/** @typedef {meta} Meta */
export default meta
