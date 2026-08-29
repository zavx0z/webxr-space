# Engine Core

`@engine/core` owns five bounded live WebGPU examples of its public rendering
contract. The external Storybook reads `catalog.json`, builds only this package
session and lazy-loads the selected owner module from `../storybook/**`.

The package runtime creates one Engine-owned native preview canvas in the same
browser tab. It follows bounds published by the shared Workbench, while
navigation, search, overviews, diagnostics and package lifecycle remain owned
by the external Storybook server.

Overview routes are real states, exact leaf routes do not end in `/`, and an
unknown route never selects another scene. The default font remains the public
`@engine/core` asset and is not copied into this declaration directory.

Migration overrides record every old overview explicitly: the former component
prefix is the category route and the former section prefix is the real subject
route. Engine therefore needs no section-only compatibility node or additional
navigation panel.
