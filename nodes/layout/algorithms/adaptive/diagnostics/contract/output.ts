import type {AdaptiveLayoutOutput} from "../../contract/output.ts"
import type {AdaptiveLayoutDiagnostics} from "../../types/adaptive.ts"

/**
Результат adaptive-раскладки вместе со счётчиками и выбранными сторонами.

@property result - Выбранная числовая геометрия.
@property diagnostics - Предел поиска, число кандидатов и итоговые стороны.
*/
export interface AdaptiveLayoutDiagnosticsOutput {
  readonly result: AdaptiveLayoutOutput
  readonly diagnostics: AdaptiveLayoutDiagnostics
}
