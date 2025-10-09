/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export default MetaFor("core-builder")
  .context((t) => ({
    type: t.enum("log", "meta").optional({ label: "Тип обрабатываемого элемента" }),
    tag: t.string.optional({ label: "Тег обрабатываемого элемента" }),
    cursor: t.array.required(/** @type {Array<number>} */ ([]), { label: "Индексный курсор схемы" }),
  }))
  .states({
    "получение элемента схемы": {
      "завершение обхода": { cursor: { length: 0 } },
      "обработка актора": { type: "meta" },
      "обработка логического операнда": { type: "log" },
    },
    "обработка актора": {},
    "обработка логического операнда": {},
    "завершение обхода": {},
  })
  .core({
    /** @type {Actor|null} */
    parent: null,
    /** @type {NodeMeta[]} */
    schema: [],
    /** @type {NodeMeta|null} */
    currNode: null,
    nodeTree: null,
  })
  .processes((process) => ({
    "получение элемента схемы": process()
      .action(({ core, context }) => {
        if (!core.schema || !core.schema.length) return {}
        console.log(core.schema)

        let target

        if (context.cursor.length === 0) {
          target = /** @type {NodeMeta} */ (core.schema[0])
          const tag = /** @type {string} */ (target.tag)
          core.currNode = target
          return { cursor: [0], tag, type: target.type }
        }

        for (const idx of context.cursor) {
        }

        return { cursor: [0] }
      })
      .success(({ data, update }) => update(data))
      .error(({ error }) => console.log(error)),
    "обработка актора": process()
      .action(({ core }) => {
        if (!core.currNode) throw new Error("Нет ноды актора для обработки")
        console.log(core.currNode)
      })
      .success(({}) => {})
      .error(({ error }) => console.log(error)),
    "обработка логического операнда": process()
      .action(async ({ core }) => {
        if (!core.currNode) throw new Error("Нет логической ноды для обработки")
        if (!core.parent) throw new Error("Нет родительского актора")

        const metaNodeLog = (await import("../nodes/log.js")).default
        const { Actor } = await import("everywhere-everything/actor")
        // @ts-ignore
        const reactionName = Object.keys(metaNodeLog.reactions.reactions)[0]
        // @ts-ignore
        const reaction = metaNodeLog.reactions.reactions[reactionName]
        reaction.cond.meta = core.parent.name
        reaction.cond.actor = core.parent.id
        const reactionActor = Actor.fromSchema(metaNodeLog, `${core.parent.name}/${core.parent.id}`)
        console.log(reactionActor)
        const state = core.parent.state
        const context = core.parent.ctx
        console.log(state, context)
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
