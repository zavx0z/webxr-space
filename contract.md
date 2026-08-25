# Engine contract

**Built for [MetaFor](https://github.com/zavx0z/metafor) and reusable as a standalone WebGPU contract.**

- Up axis: `z`
- Length unit: `mm`
- World scale: `1 world unit = 1 mm`

For MetaFor visualization, the product projection passes positions, radii, diameters, camera distances, and grid sizes in millimetres.

This means:

- runtime projections provide data in Z-up millimetres;
- consumers do not convert axes or units again;
- renderer adaptation belongs inside Engine rather than an application scene.

## Development Storybook boundary

`packages/core/storybook/**` owns the live examples of this public contract,
but remains development-only. It is absent from `@engine/core` exports and the
production TypeScript project. The repository Storybook loads each example by
its exact registered route; an unknown suffix cannot select another scene.

## Default font asset

Engine owns the project-default TTF and exposes it through the explicit
`@engine/core/fonts/jetbrains-mono-bold.ttf` asset subpath. The main
`@engine/core` entrypoint does not import the asset.

A browser composition root declares the URL it actually serves with
`<meta name="engine-default-font" content="…">`. The optional
`@engine/core/default-font` entrypoint resolves that declaration and caches one
fetch and one parsed `TrueTypeFont` per absolute URL. Package and component code
does not own a font route or copy.

An explicitly supplied runtime font or font URL bypasses the document default.
The meta declaration itself has no network side effect, so choosing another
font never requests the Engine-owned default.

## Transform hierarchy

Every `Object3D` defines only its local position, rotation, and scale. Engine computes a visual child's `matrixWorld` by composing its local matrix with the entire parent chain, and Renderer consumes that world matrix. Retained interfaces therefore keep visual children below their `Object3D` parent instead of baking the parent transform into every child's geometry.

Changing only a parent transform updates inherited `matrixWorld` and the frame. It does not require unchanged children to be planned or materialized again. Text, icons, sockets, strokes, radii, padding, gaps, and other visual content continuously inherit the same transform. A screen-space minimum may enlarge a separate invisible hit target, but it must not alter visible geometry.

Framebuffer clipping remains material presentation rather than a geometry change. It is derived from the actual `matrixWorld` chain of the same `Object3D` subtree and the owner's fixed viewport. A parent transform can therefore update clipping on the next frame without rematerialization. Plain single-color interface meshes obey the same optional clip as text, images, and rounded meshes.

`Object3D.presentationClips` is the neutral resolved clip chain for one
renderable. Each rounded rectangle names the `Object3D` coordinate space that
owns its centre, half-size, and corner radii. Renderer evaluates every shape in
that live coordinate space and intersects the results without rewriting child
geometry. A rectangular clip is the same shape with zero radii. Invalid,
non-invertible, or unsupported clipped presentation fails closed instead of
silently drawing outside the requested boundary.

One renderable has at most 16 presentation clip shapes. The total per-frame
record budget is derived from the device's storage-binding and buffer limits.
Over-depth chains and chains that cannot fit whole share one invalid record and
fail closed; Renderer never truncates a chain or silently removes its clip.

## Soft SDF shadow

A rounded interface shadow is analytical presentation of the same local rectangle, not a separate texture or geometric blur ring. One expanded quad evaluates rounded distance and smooth falloff in a single fragment pass. A normal interface shadow does not use an offscreen framebuffer, blur texture, repeated bands, or post-processing.

Source shape size, corner radii, spread, and blur are expressed in local units and continuously inherit the parent's `matrixWorld`. Pure pan or zoom does not rematerialize shadow geometry. Color and opacity are controlled presentation inputs and do not introduce hidden selection state into Engine.

## Analytical color picker

`ColorPickerMaterial` draws wheel, value, alpha, and swatch modes with one texture-free quad on a plane. The wheel uses hue, saturation, and a controlled value. The value strip is the same achromatic `white → black` gradient regardless of hue or saturation. Alpha and swatch modes preserve the controlled HSV color and checker composition; correcting one mode does not change packing or presentation for another.

## Plain and skinned meshes

Each visible object submits only its own model and material data. A plain object does not create, clear, or upload bone matrices.

`SkinnedMesh` binds one mesh to one `Skeleton`. Bones and inverse pose matrices form pairs; Renderer consumes only existing pairs and no more than 128 bones. A vertex is first transformed by weighted bone matrices in mesh-local space, then by the mesh world transform. Skeleton animation does not replace the scene position of the mesh itself.

Bone data is uploaded only for `SkinnedMesh`. GPU buffer ownership and upload-range selection belong to Engine; consumers do not reserve or update those resources directly.

## Thin film

`ThinFilmMaterial` presents a closed mesh surface in one transparent pass. Color depends only on the normal, camera position, and material parameters: Fresnel strengthens the edge and bounded spectral interference adds iridescent shift. The material does not read the framebuffer and needs no textures, post-processing, or private animation time.

`rimColor` is the source for edge, reflection, and highlight color. The material never replaces it with a built-in palette.

`highlightSize` controls the angular width of specular highlights. Larger values widen and soften them; smaller values keep them compact. The parameter changes analytical exponents inside the same pass. Peak intensity falls as the highlight widens, so a broader highlight does not add unbounded energy. A value of `0` disables local specular spots while preserving the Fresnel outline and thin-film interference. This rule is independent of shape, screen size, geometric size, and nesting depth.

The transparent film passes the depth test after the opaque scene but does not write depth. Both sides of a closed sphere or torus can therefore participate in one frame, and an unchanged scene does not require a continuous render loop.
