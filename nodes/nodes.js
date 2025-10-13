/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").Meta} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("nodes")
  .context((t) => ({
    children: t.number.required(0, { label: "Кол-во детей" }),
    current: t.number.required(0, { label: "Индекс текущего ребенка" }),

    process: t.array.required(/** @type {string[]} */ ([]), { label: "создаются" }),
    success: t.array.required(/** @type {string[]} */ ([]), { label: "успешно завершены" }),
    rejected: t.array.required(/** @type {string[]} */ ([]), { label: "завершились с ошибкой" }),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    данные: {
      ошибка: { error: { null: false } },
      сборка: { children: { gt: 0 } },
      конец: { children: { eq: 0 } },
    },
    сборка: {
      ошибка: { error: { null: false } },
      следующий: {},
    },
    следующий: {
      ошибка: { error: { null: false } },
      сборка: { current: { gte: 0 } },
      ожидание: { current: { lt: 0 } },
    },
    ожидание: {
      конец: { process: { length: 0 } },
    },
    конец: {},
    ошибка: {
      // "данные": {},
    },
  })
  .core({
    /** @type {NodeType[]} */
    child: [],
  })
  .processes((process) => ({
    данные: process()
      .action(({ core }) => core.child.length)
      .success(({ data, update }) => update({ children: data, current: 0 }))
      .error(({ error, update }) => update({ error: error.message })),
    сборка: process()
      .action(async ({ self, context, core }) => {
        const [{ Actor }, { default: meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/node.js"),
        ])
        const node = core.child[context.current]
        const id = `${self.path} ${node?.type}:${context.current}`
        Actor.appendChild(self.actor, meta, { id, core: { node } })
        return [...context.process, id]
      })
      .success(({ data, update }) => update({ process: data }))
      .error(({ error, update }) => update({ error: error.message })),
    следующий: process()
      .action(({ context: { current, children } }) => {
        const last = current + 1
        return last === children ? -1 : last
      })
      .success(({ data, update }) => update({ current: data }))
      .error(({ error, update }) => update({ error: error.message })),
    конец: process()
      .action(({ self }) => self.destroy(false))
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions((reaction) => [
    [
      ["ожидание", "сборка", "следующий"],
      reaction()
        .filter(({ self, context }) => ({
          actor: { in: context.process },
          op: "remove",
        }))
        .equal(({ update, actor, context, self }) => {
          // if (context.success.length + 1 === context.process.length) self.destroy(false)
          // else
          update({ success: [...context.success, actor] })
        }),
    ],
    [
      ["ожидание", "сборка", "следующий"],
      reaction()
        .filter(({ context }) => ({
          actor: { in: context.process },
          path: "/context",
          op: "replace",
          value: { includeKey: "error" },
        }))
        .equal(({ update, actor, context }) => {
          if (context.rejected.length + 1 + context.success.length === context.process.length)
            update({ error: "Ожидание завершено с ошибкой" })
          update({ rejected: [...context.rejected, actor] })
        }),
    ],
  ])
  .view()

/** @typedef {meta} Meta */
export default meta
