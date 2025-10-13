/**
 * @typedef {Record<string, any>} Shared
 * @typedef {meta} Meta
 */
export const meta = MetaFor("view")
  .context((t) => ({
    error: t.string.optional({ label: "Ошибка" }),
  }))
  .states({
    начало: {
      ошибка: { error: { null: false } },
      ожидание: {},
    },
    ожидание: {
      конец: {},
    },
    ошибка: {
      ожидание: {},
      конец: {},
    },
    конец: {},
  })
  .core({
    /** @type {Shared} */
    data: {},
  })
  .processes((process) => ({
    ошибка: process()
      .action(async ({ self, core, context }) => {
        return { error: null }
      })
      .success(({ data, update }) => update(data))
      .error(({ error, update }) => update({ error: error.message })),
  }))
  .reactions((reaction) => [
    [
      ["начало", "ожидание", "ошибка", "конец"],
      reaction()
        .filter(({ context, self }) => ({
          meta: self.meta,
          actor: "",
          path: "/state",
          op: "replace",
          value: "состояние",
        }))
        .equal(({ self }) => self.destroy(false)),
    ],
  ])
  .view()

export default meta
