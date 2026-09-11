import type {MermaidGraph} from "./graph.ts"

/**
Результат асинхронного разбора, хранимый {@link @webxr/markdown/mermaid#Mermaid | компонентом Mermaid}.
Готовность измерений и раскладки отслеживается отдельно по ссылке `readyGraph`.

@property source - Исходник, для которого сохранён результат или ошибка.
Сравнение с текущими props не позволяет показать устаревший результат как готовый.

@property graph - Последний успешный {@link MermaidGraph}; `null` до первого успеха.
При ошибке следующего разбора прежний граф сохраняется, но скрывается представлением.

@property error - Сообщение последней ошибки; успешный разбор сбрасывает его в `null`.
Отсутствие ошибки само по себе не означает готовности графа.
*/
export interface MermaidState {
  readonly source: string
  readonly graph: MermaidGraph | null
  readonly error: string | null
}
