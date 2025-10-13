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

    builderId: t.string.optional(),
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
      .action(({ core }) => {})
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "": process()
      .action(({}) => {})
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
  }))
  .reactions()
  // .reactions((reaction) => [
  //   [
  //     ["сборка актора", "сборка логического"],
  //     reaction()
  //       .filter(({ context }) => ({
  //         actor: /** @type {string} */ (context.builderId),
  //         path: "/state",
  //         op: "replace",
  //         value: "завершение",
  //       }))
  //       .equal(({ self }) => self.destroy()),
  //   ],
  // ])
  .view()
/** @typedef {meta} Meta */
export default meta
