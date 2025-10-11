/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/actor").Fields} Fields
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("node-builder")
  .context((t) => ({
    type: t.enum("log", "meta", "map", "cond", "text", "el").optional({ label: "Тип элемента" }),
    tag: t.string.optional(),
    path: t.string.optional({ label: "Путь ноды" }),

    builderId: t.string.optional(),
  }))
  .states({
    "определение сборщика": {
      "сборка актора": { type: "meta", tag: { startsWith: "meta-" }, path: { null: false } },
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
    /** @type {Fields|null} */
    fields: null,
    /** @type {Actor|null} */
    builder: null,
  })
  .processes((process) => ({
    "определение сборщика": process()
      .action(({ core }) => {
        if (!core.node) throw new Error("Нода не передана")
        if (!core.fields) throw new Error("Иерархия не передана")

        if (Object.hasOwn(core.node, "tag")) {
          const node = /** @type {NodeMeta } */ (core.node)
          if (typeof node.tag === "string") return { type: node.type, tag: node.tag }
          else return { type: node.type }
        } else return { type: core.node.type }
      })
      .success(({ update, data }) => update(data))
      .error(({ error }) => console.log(error)),
    "сборка актора": process()
      .action(async ({ context, self, core }) => {
        const [{ Actor }, { meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/meta.js"),
        ])
        const builderId = `${self.actor}-${self.path}`
        const actor = Actor.fromSchema({
          meta,
          id: builderId,
          path: self.path + "/0",
          core: { node: core.node, hierarchy: core.fields },
          context: { path: context.path },
        })
        core.builder = actor
        return {}
      })
      .success(({ update, data }) => update(data))
      .error(({ error }) => console.log(error)),
    "сборка логического": process()
      .action(async ({ core, context }) => {
        // if (!core.currNode) throw new Error("Нет логической ноды для обработки")
        // if (!core.node) throw new Error("Нет родительского актора")
        // const node = /** @type {NodeLogical} */ (core.currNode)
        // const metaNodeLog = (await import("./log.js")).default
        // const { Actor } = await import("everywhere-everything/actor")
        // // @ts-ignore
        // metaNodeLog.context.state["default"] = core.parent.state.value
        // console.log(metaNodeLog, core.parent.state.current)
        // Actor.fromSchema(metaNodeLog, context.path.join("/"), {
        //   schema: core.currNode,
        //   parent: core.node,
        //   evalCondition: new Function("_", "return Boolean(" + node.expr + ");"),
        // })
      })
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "сборка завершена": process()
      .action(({ core }) => {
        core.builder?.destroy()
      })
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
          actor: /** @type {string} */ (context.builderId),
          path: "/state",
          value: "завершение",
        }))
        .equal(({ update }) => update({ type: null })),
    ],
  ])
  .view()
/** @typedef {meta} Meta */
