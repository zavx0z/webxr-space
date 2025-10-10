/**
 * @typedef {import("everywhere-everything/metafor").NodeLogical} NodeLogical
 * @typedef {import("everywhere-everything/actor").Actor} Actor
 */

export default MetaFor("node-log")
  .context((t) => ({
    state: t.string.optional(),
    status: t.boolean.optional(),
    children: t.array.required(/** @type {string[]} */ ([])),
  }))
  .states({
    проверка: {
      создание: { status: true },
      удаление: { status: false, children: { length: { min: 1 } } },
      ожидание: {},
    },
    ожидание: {
      проверка: { state: { null: false } },
    },
    создание: {
      ожидание: {},
    },
    удаление: {
      ожидание: {},
    },
  })
  .core({
    data: {},
    /** @type {Actor|null} */
    parent: null,
    /** @type {NodeLogical|null} */
    schema: null,
    context: null,
    state: null,
    /** @type {(([state]:[string|null]) => boolean)} */
    evalCondition: (state) => false,
  })
  .processes((process) => ({
    проверка: process()
      .action(({ core, context, self }) => {
        if (!core.parent) throw new Error("Отсутствует родительский актор")
        if (!core.schema) throw new Error("Отсутствует схема компонентов")
        console.log(self)
        return { status: core.evalCondition([context.state]), children: core.schema.child.map((i) => i.type) }
      })
      .success(({ data, update }) => {
        console.log(data)
        update({ ...data, state: null })
      })
      .error(({ error, update }) => {
        console.log("error", error)
        update({ state: null })
      }),
    создание: process()
      .action(async ({ core }) => {
        if (!core.schema) throw new Error("Отсутствует схема компонентов")

        const { meta } = await import("./node-builder.js")
        const { Actor } = await import("everywhere-everything/actor")

        // Actor.fromSchema(meta, "canvas/0", { child: core.schema.child })
      })
      .error(({ error }) => console.log(error)),
    удаление: process()
      .action(({}) => {})
      .error(({ error }) => console.log(error)),
    ожидание: process()
      .action(({}) => {})
      .success(({ update }) => update({ status: null }))
      .error(({ error }) => console.log(error)),
  }))
  .reactions((reaction) => [
    [
      ["ожидание", "создание", "удаление"],
      reaction({ label: "Обновление состояния родительского актора" })
        .filter(({ self }) => ({
          actor: self.actor.split("/")[1],
          path: "/state",
          op: "replace",
        }))
        .equal(({ update, patch }) => {
          const upd = update({ state: patch.value })
          console.log(upd)
        }),
    ],
  ])
  .view()
