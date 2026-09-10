# Эталонные данные TopDown

`dagre-7.0.14.json`: независимый числовой вывод npm dagre-d3-es7.0.14, pin которого
находится в официальном Mermaid11.16.0/package.json. `generate.ts` использует
уже установленный пакет через dependency graph Markdown, проверяет его версию,
записывает SHA-256 исходников Dagre/Graphlib и вывод для заданных synthetic графов.
Обычный test runner читает JSON, не запускает generator и не обновляет expected.
Production Layout не зависит ни от Mermaid, ни от dagre-d3-es/lodash.

`ports-before.json`: снимки старого портового TopDown до доработки (HEAD5d241d4),
зафиксированные исследовательским compare.ts. Проверяются без допуска через
сериализацию полного результата, чтобы не переместить Socket endpoints случайно.

`desktop-snapshot.json`: manifest исторического Desktop26.903.61454/build8378,
снятого9сентября2026; все8хешей подтверждены исследованием. Пути приложения в
manifest являются provenance, а не командой прочитать текущую установку.
Исходная сессия: codex://threads/01a086ab-c7c3-78b2-8de4-dcdf34c038c7.
Ни synthetic размеры, ни JSON upstream не являются извлечённым Desktop SVG.
Полного Desktop replay, точного font/style snapshot и screenshot metrics нет.

Старое ordering поведение проверено также в сохранённом Desktop chunk:
`dagre-4c63bfb16e34.pretty.js`758–780. Shape/rounded:
`chunk-ZGVPDNZ5-4ef30b12dcf2.pretty.js`53–61,287–300,1392–1394;
`chunk-52WLFC77-a126479d4a86.pretty.js`24–68,268,344.
Desktop marker postprocess:
`mermaid-diagram-b1da182f1e0f.pretty.js`45–65,135–146.
Эти файлы не вендорятся в продукт: bundle не объявляется open source.
Адаптированная открытая часть old flat order сохраняет MIT notice отдельно.

Источники open-source версии:
- https://github.com/mermaid-js/mermaid/blob/mermaid%4011.16.0/packages/mermaid/package.json
- https://github.com/tbo47/dagre-es
- https://github.com/mermaid-js/mermaid/blob/mermaid%4011.16.0/packages/mermaid/src/utils/lineWithOffset.ts

`live-markdown.json` хранит фактические MCP CSS rectangles, capture provenance и
независимое сравнение этих размеров через `compare-live.ts`. Это observation,
не новое golden expected по screenshot. `live-identity.json` фиксирует сохранение
21 opaque semantic Element ID при live selection; source updates проверяются
отдельным integration test.
