/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").Meta} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

const meta = MetaFor("child-build-runner")
  .context((t) => ({
    children: t.number.required(0, { label: "Кол-во детей" }),
    current: t.number.required(0, { label: "Индекс текущего ребенка" }),

    process: t.array.required(/** @type {number[]} */ ([]), { label: "создаются" }),
    success: t.array.required(/** @type {number[]} */ ([]), { label: "успешно завершены" }),
    rejected: t.array.required(/** @type {number[]} */ ([]), { label: "завершились с ошибкой" }),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "сбор данных": {
      ошибка: { error: { null: false } },
      сборка: { children: { gt: 0 } },
      завершение: { children: { eq: 0 } },
    },
    сборка: {
      ошибка: { error: { null: false } },
      "выбор следующего": {},
    },
    "выбор следующего": {
      ошибка: { error: { null: false } },
      сборка: { current: { gte: 0 } },
      "ожидание всех результатов": { current: { lt: 0 } },
    },
    "ожидание всех результатов": {},
    завершение: {},
    ошибка: {
      // "сбор данных": {},
    },
  })
  .core({
    /** @type {NodeType[]} */
    child: [],
  })
  .processes((process) => ({
    "сбор данных": process()
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
      })
      .error(({ error, update }) => update({ error: error.message })),
    "выбор следующего": process()
      .action(({ context: { current, children } }) => {
        const last = current + 1
        return last === children ? -1 : last
      })
      .success(({ data, update }) => update({ current: data }))
      .error(({ error, update }) => update({ error: error.message })),
    "ожидание всех результатов": process()
      .action(({ context }) => {})
      .success(({ data, update }) => update({}))
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions()
  .view()

/** @typedef {meta} Meta */
export default meta
