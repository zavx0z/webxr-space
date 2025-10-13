/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/actor").Fields} Fields
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("node")
  .context((t) => ({
    type: t.enum("log", "meta", "map", "cond", "text", "el").optional({ label: "Тип элемента" }),
    tag: t.string.optional(),

    id: t.string.optional({ label: "Id сборщика" }),
    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "определение сборщика": {
      "сборка актора": { type: "meta", tag: { startsWith: "meta-" } },
      "сборка логического": { type: "log" },
      "сборка завершена": { type: null },
    },
    "сборка актора": {
      "сборка завершена": { type: null },
    },
    "сборка логического": {
      "сборка завершена": { type: null },
    },
    "сборка завершена": {},
  })
  .core({
    /** @type {NodeType|null} */
    node: null,
    /** @type {Actor|null} */
    builder: null,
  })
  .processes((process) => ({
    "определение сборщика": process()
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
    "сборка актора": process()
      .action(async ({ context, self, core }) => {
        const [{ Actor }, { meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/meta.js"),
        ])
        Actor.appendChild(self.actor, meta, {
          id: `${self.actor}-${self.path}`,
          core: { node: core.node },
        })
      })
      .error(({ error, update }) => update({ error: error.message })),
    "сборка логического": process()
      .action(async ({ core, self }) => {
        if (!core.node) throw new Error("Нет родительского актора")
        const [{ Actor }, { meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/logical.js"),
        ])
        Actor.appendChild(self.actor, meta, {
          core: { node: core.node },
        })
      })
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "сборка завершена": process()
      .action(({ core }) => {})
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "": process()
      .action(({}) => {})
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
  }))
  .reactions((reaction) => [
    [
      ["сборка актора", "сборка логического"],
      reaction()
        .filter(({ context }) => ({
          actor: /** @type {string} */ (context.id),
          path: "/state",
          op: "replace",
          value: "завершение",
        }))
        // .equal(({ self }) => {}),
        .equal(({ self }) => {
          if (self.path !== "0") self.destroy(false)
        }),
    ],
  ])
  .view()
/** @typedef {meta} Meta */
export default meta
