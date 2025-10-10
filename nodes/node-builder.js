/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").MetaSchema} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("node-builder")
  .context((t) => ({
    type: t.enum("log", "meta", "map", "cond", "text", "el").optional({ label: "Тип обрабатываемого элемента" }),
    tag: t.string.optional({ label: "Тег обрабатываемого элемента" }),
    src: t.string.optional({ label: "Путь к мета-ноде" }),

    path: t.array.required(/** @type {Array<number>} */ ([]), { label: "Индексный путь" }),
  }))
  .states({
    "сбор данных по ноде": {
      "сборка актора": { type: "meta", src: { null: false } },
      "сборка логического": { type: "log" },
      "сборка завершена": {},
    },
    "сборка актора": {
      "сборка завершена": {},
    },
    "сборка логического": {
      "сборка завершена": {},
    },
    "сборка завершена": {},
  })
  .core({
    /** @type {NodeType|null} */
    node: null,
    /** @type {NodeType|null} */
    currNode: null,
    nodeTree: null,
  })
  .processes((process) => ({
    "сбор данных по ноде": process()
      .action(({ core }) => {
        if (!core.node) throw new Error("Нода не передана")
        // console.log(core.node)
        return {
          type: core.node.type,
          tag: /** @type {any} */ (core.node).tag || null,
          src: /** @type {any} */ (core.node).string?.src || null,
        }
      })
      .success(({ data, update }) => update(data))
      .error(({ error }) => console.log(error)),
    "сборка актора": process()
      .action(async ({ context }) => {
        // if (!core.node) throw new Error("Нет ноды актора для обработки")
        const schema = /** @type {MetaSchema} */ ((await import(/** @type {string}*/ (context.src))).default)
        const path = context.path.join("/")
        return { child: (schema.render || []).map((_, idx) => `${path}/${idx}`), path: [...context.path] }
      })
      .success(({ update, data }) => update(data))
      .error(({ error }) => console.log(error)),
    "сборка логического": process()
      .action(async ({ core, context }) => {
        if (!core.currNode) throw new Error("Нет логической ноды для обработки")
        if (!core.node) throw new Error("Нет родительского актора")

        const node = /** @type {NodeLogical} */ (core.currNode)
        const metaNodeLog = (await import("./log.js")).default
        const { Actor } = await import("everywhere-everything/actor")
        // @ts-ignore
        metaNodeLog.context.state["default"] = core.parent.state.value
        // console.log(metaNodeLog, core.parent.state.current)
        // Actor.fromSchema(metaNodeLog, context.path.join("/"), {
        //   schema: core.currNode,
        //   parent: core.node,
        //   evalCondition: new Function("_", "return Boolean(" + node.expr + ");"),
        // })
      })
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "": process()
      .action(({}) => {})
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
  }))
  .reactions()
  .view()
