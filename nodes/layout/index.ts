/**
Числовая раскладка заранее измеренных графов.

`algorithms` хранит самостоятельные политики и их Worker client/executor,
`protocol` задаёт переносимые входы и результаты, `execution` управляет
транспортом запросов. Общие placement и routing находятся в `shared`.
Измерение текста, DOM, панорамирование и живая модель остаются у вызывающего кода.

@packageDocumentation
*/

export * from "./protocol/types/src/index.ts"
export {
  layoutFixed,
  type FixedLayoutInput,
  type FixedLayoutOutput,
} from "./algorithms/fixed/index.ts"
