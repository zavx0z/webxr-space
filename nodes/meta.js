/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
 * @typedef {import("everywhere-everything/metafor").Meta} MetaType
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export const meta = MetaFor("meta-builder", {
  desc: "Актор для создания мета-акторов",
})
  .context((t) => ({
    id: t.string.optional({ label: "Актор-id" }),
    path: t.string.optional({ label: "Актор-путь" }),

    tag: t.string.optional({ label: "Мета-тег" }),
    src: t.string.optional({ label: "Мета-адрес" }),
    child: t.boolean.required(false, { label: "Наличие дочерних элементов" }),

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "подготовка данных": {
      "загрузка меты": { src: { null: false } },
      ошибка: { error: { null: false } },
    },
    "загрузка меты": {
      "создание актора": { src: { null: false } },
    },
    "создание актора": {
      ошибка: { error: { null: false } },
      "передача дочерних элементов": { child: true },
      завершение: {},
    },
    "передача дочерних элементов": {
      ошибка: { error: { null: false } },
      завершение: {},
    },
    ошибка: {},
    завершение: {},
  })
  .core({
    /** @type {NodeMeta|null} */
    node: null,
    /** @type {MetaType|null} */
    meta: null,
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
      .error(({ error, update }) => update({ error: error.message })),
    "загрузка меты": process()
      .action(async ({ context, core }) => {
        const { meta } = await import(/**@type {string} */ (context.src))
        core.meta = meta
        return meta.render && meta.render.length
      })
      .success(({ data, update }) => update({ child: !!data }))
      .error(({ error, update }) => update({ error: error.message })),
    "создание актора": process()
      .action(async ({ context, core }) => {
        if (!core.meta) throw new Error("Отсутствует мета")
        const { Actor } = await import("everywhere-everything/actor")
        Actor.fromSchema({ meta: core.meta, id: crypto.randomUUID(), path: context.path })
      })
      // .success(({ data, update }) => {})
      .error(({ error, update }) => update({ error: error.message })),
    "передача дочерних элементов": process()
      .action(async ({ core }) => {
        if (!core.meta) throw new Error("Отсутствует мета")
        const [{ Actor }, { default: meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import("nodes/nodes.js"),
        ])
        // console.log(core.meta.render, meta)
      })
      .error(({ error, update }) => update({ error: error.message })),
    завершение: process({ label: "Самоуничтожение" }).action(({ self }) => self.destroy()),
  }))
  .reactions()
  .view()

/** @typedef {meta} Meta */
