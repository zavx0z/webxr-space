/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").Meta} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

const meta = MetaFor("child-build-runner")
  .context((t) => ({
    children: t.array.optional([], { label: "Массив дочерних узлов" }),

    count: t.number.optional(0, { label: "Кол-во детей" }),
    currentChildIndex: t.number.optional(0, { label: "Индекс текущего ребенка" }),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "сбор данных": {
      "обработка детей": { count: { gt: 0 } },
    },
    "обработка детей": {
      "создание node-builder": {},
      завершение: {},
      ошибка: { error: { length: { min: 1 } } },
    },
    "создание node-builder": {
      "следующий ребенок": {},
      ошибка: { error: { length: { min: 1 } } },
    },
    "следующий ребенок": {
      // "обработка детей": {},
      завершение: {},
    },
    завершение: {},
    ошибка: {
      "сбор данных": {},
    },
  })
  .core({
    /** @type {NodeType[]} */
    child: [],
  })
  .processes((process) => ({
    "сбор данных": process()
      .action(({ core }) => core.child.length)
      .success(({ data, update }) => update({ count: data }))
      .error(({ error, update }) => update({ error: error.message })),
    "обработка детей": process()
      .action(() => {
        return {}
      })
      .success(() => {})
      .error(({ error, update }) => update({ error: error.message })),
    "создание node-builder": process()
      .action(() => {
        return {}
      })
      .success(() => {})
      .error(({ error, update }) => update({ error: error.message })),
    "следующий ребенок": process()
      .action(() => {
        return {}
      })
      .success(() => {})
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions()
  .view()

/** @typedef {meta} Meta */
export default meta
