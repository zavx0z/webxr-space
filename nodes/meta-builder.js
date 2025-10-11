/**
 * @typedef {import("everywhere-everything/metafor").NodeType} NodeType
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").NodeElement} NodeElement
 * @typedef {import("everywhere-everything/metafor").NodeText} NodeText
 * @typedef {import("everywhere-everything/metafor").NodeCondition} NodeCondition
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/metafor").NodeMap} NodeMap
 * @typedef {import("everywhere-everything/metafor").MetaSchema} MetaSchema
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 * @typedef {import("everywhere-everything/actor").ActorHierarchy} ActorHierarchy
 */

export const meta = MetaFor("meta-builder", {
  description: "Актор для создания мета-акторов",
})
  .context((t) => ({
    tag: t.string.optional({ label: "Тег мета-элемента" }),
    src: t.string.optional({ label: "Путь к мета-схеме" }),
    actorId: t.string.optional({ label: "ID созданного актора" }),
    errorMessage: t.string.optional({ label: "Сообщение об ошибке" }),
    path: t.string.optional({ label: "Путь ноды" }),
  }))
  .states({
    "подготовка данных": {
      "загрузка мета-схемы": { src: { null: false } },
    },
    "загрузка мета-схемы": {
      "создание мета-актора": {},
      ошибка: { errorMessage: { length: { min: 1 } } },
    },
    "создание мета-актора": {
      завершение: {},
      ошибка: { errorMessage: { length: { min: 1 } } },
    },
    завершение: {},
    ошибка: {
      "подготовка данных": {},
    },
  })
  .core({
    /** @type {NodeMeta|null} */
    node: null,
    /** @type {Actor|null} */
    createdActor: null,
  })
  .processes((process) => ({
    "подготовка данных": process()
      .action(({ core }) => {
        if (!core.node) throw new Error("Нода не передана")
        if (!core.node.string?.src) throw new Error("Нет параметра src!")
        if (typeof core.node.tag !== "string") throw new Error("Реализовать обработку динамического тега")
        return { tag: core.node.tag, src: /** @type {string} */ (core.node.string.src) }
      })
      .success(({ data, update }) => update(data))
      .error(({ error }) => console.log(error)),
    "загрузка мета-схемы": process({ label: "Загрузка мета-схемы" })
      .action(async ({ context }) => {
        const [{ meta }, { Actor }] = await Promise.all([
          import("nodes/meta-builder.js"),
          import("everywhere-everything/actor"),
        ])

        return {}
      })
      .success(() => {})
      .error(({ error }) => console.log("Ошибка загрузки мета-схемы:", error)),
    "создание мета-актора": process({ label: "Создание мета-актора" })
      .action(() => {
        // console.log("Процесс: создание мета-актора")
        return {}
      })
      .success(() => {})
      .error(({ error }) => console.log("Ошибка создания мета-актора:", error)),
  }))
  .reactions()
  .view()
