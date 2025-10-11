/**
 * @typedef {import("everywhere-everything/metafor").NodeMeta} NodeMeta
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

    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    "подготовка данных": {
      "создание актора": { src: { null: false } },
      ошибка: { error: { null: false } },
    },
    "создание актора": {
      ошибка: { error: { null: false } },
      завершение: {},
    },
    ошибка: {
      "подготовка данных": {},
    },
    завершение: {},
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
    "создание актора": process()
      .action(async ({ context }) => {
        const [{ Actor }, { meta }] = await Promise.all([
          import("everywhere-everything/actor"),
          import(/**@type {string} */ (context.src)),
        ])
        Actor.fromSchema({ meta, id: crypto.randomUUID(), path: context.path })
      })
      .error(({ error }) => console.log("Ошибка создания мета-актора:", error)),
    завершение: process({ label: "Самоуничтожение" }).action(({ self }) => self.destroy()),
  }))
  .reactions()
  .view()

/** @typedef {meta} Meta */
