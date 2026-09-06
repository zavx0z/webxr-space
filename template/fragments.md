# Compiled fragments

Короткий JSX fragment `<>...</>` в возврате компонента и внутри intrinsic
дерева компилируется прямо в существующий список `mount().nodes`. Он не создаёт
Element, дополнительный ComponentRoot, Document или runtime JSX.

```tsx
function TextRun(props: Readonly<{text: string}>) {
  return <>{props.text}</>
}
```

Допустимы пустые, текстовые, вложенные и многокорневые fragments, в том числе
fragment в JSX expression. В keyed-списке ключ по-прежнему принадлежит
governed-компоненту; его fragment может содержать несколько корневых узлов.
Перестановка перемещает существующий component range, сохраняя состояние,
listeners и фокус. Живые узлы не отправляются во временный отключённый
DocumentFragment. Staging новых компонентов остаётся прежним.

Остальные ограничения первого профиля не расширяются: fragment-значения
через `props.children` и fragment вместо keyed component в `.map()` пока
не принимаются. Существующие governed component children остаются доступны.

Проверка: `tests/fragments.test.ts` и `tests/fragments.fixture.tsx` — вложенность,
пустой и текстовый корень, keyed reorder, identity, focus, state и однократный
cleanup. CodeEditor и Markdown используют этот же механизм.
