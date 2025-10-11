/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").MetaSchema} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

const meta = MetaFor("child-build-runner")
  .context((t) => ({
    children: t.array.optional([], { label: "Массив дочерних узлов" }),
    currentChildIndex: t.number.optional(0, { label: "Индекс текущего ребенка" }),
    processedChildren: t.array.optional([], { label: "Обработанные дети" }),
    errorMessage: t.string.optional({ label: "Сообщение об ошибке" }),
  }))
  .states({
    ожидание: {
      "обработка детей": { children: { length: { min: 1 } } },
    },
    "обработка детей": {
      "создание node-builder": {},
      завершение: {},
      ошибка: { errorMessage: { length: { min: 1 } } },
    },
    "создание node-builder": {
      "следующий ребенок": {},
      ошибка: { errorMessage: { length: { min: 1 } } },
    },
    "следующий ребенок": {
      "обработка детей": {},
      завершение: {},
    },
    завершение: {},
    ошибка: {
      ожидание: {},
    },
  })
  .core({
    /** @type {NodeType|null} */
    currentChild: null,
    /** @type {Actor[]} */
    createdActors: [],
  })
  .processes((process) => ({
    "обработка детей": process({ label: "Обработка дочерних узлов" })
      .action(() => {
        console.log("Процесс: обработка детей")
        return {}
      })
      .success(() => {})
      .error(({ error }) => console.log("Ошибка обработки детей:", error)),

    "создание node-builder": process({ label: "Создание node-builder" })
      .action(() => {
        console.log("Процесс: создание node-builder")
        return {}
      })
      .success(() => {})
      .error(({ error }) => console.log("Ошибка создания node-builder:", error)),

    "следующий ребенок": process({ label: "Переход к следующему ребенку" })
      .action(() => {
        console.log("Процесс: следующий ребенок")
        return {}
      })
      .success(() => {})
      .error(({ error }) => console.log("Ошибка перехода к следующему ребенку:", error)),
  }))
  .reactions()
  .view()

/** @typedef {meta} Meta */
export default meta
