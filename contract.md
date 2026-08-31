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
production TypeScript project. `packages/core/.storybook/catalog.json` binds
those owner modules as data; its structural runtime adapter imports no
Storybook package. The external server lazy-loads only an exact registered
route, and an unknown suffix cannot select another scene.

## Default font asset

Engine owns the project-default regular UI TTF and exposes it through the
explicit `@engine/core/fonts/inter-regular.ttf` asset subpath. It is the exact
Blender v5.2.0 `Inter.woff2` source instantiated at `wght=400` into the sfnt
form accepted by `TrueTypeFont`; its source, transform, hashes and OFL license
are recorded next to the asset. The previous JetBrains Mono Bold asset remains
available through `@engine/core/fonts/jetbrains-mono-bold.ttf` only for callers
that choose it explicitly. The main `@engine/core` entrypoint does not import
either asset.

A browser composition root declares the URL it actually serves with
`<meta name="engine-default-font" content="…">`. The optional
`@engine/core/default-font` entrypoint resolves that declaration and caches one
fetch and one parsed `TrueTypeFont` per absolute URL. Package and component code
does not own a font route or copy.

An explicitly supplied runtime font or font URL bypasses the document default.
The meta declaration itself has no network side effect, so choosing another
font never requests the Engine-owned default.

## TrueType text geometry

`Text` and `CachedText` materialize each Unicode code point from the exact
`TrueTypeFont` supplied by the caller. Static glyph geometry is cached by the
pair `(font identity, glyph id)` in a font-keyed `WeakMap`; equal glyph numbers
from different fonts can never share outlines or cover bounds. The bounded
string layout cache remains keyed by exact font identity, text, font size,
letter spacing and optional space advance.

The stencil cover for a glyph spans its complete horizontal advance cell,
including left and right side bearings. Ink that overhangs that cell expands
the cover by the existing bounded precision pad. The final glyph therefore
cannot lose its rightmost samples merely because `outline.xMax` ends before
`advanceWidth`; consumers do not compensate with padding, wider clips or a
smaller font.

Letter spacing is inserted only between adjacent code points, including on
both sides of a space, and never after the final code point. Default spaces use
the retained `0.3em` Engine advance unless a caller explicitly supplies
`spaceAdvance`. Kerning, shaping, ligatures, bidi and fallback remain outside
this bounded geometry contract.

`bun run build:font` regenerates the accepted TTF from the pinned official
Blender source with the repository-owned hash gates. It requires the MacPorts
HarfBuzz/FreeType `hb-subset` toolchain and refuses to replace the asset when
the source or output bytes differ from the recorded provenance.

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

## ViewPoint control ownership

`ViewPoint` owns the trackball orbit, view-plane pan and anchored zoom
operations that change its position, target and up vector. Its built-in browser
listeners use the same public operations. A composition host with several
input owners may dispose those listeners, route the browser event itself, and
then call `orbit()`, `pan()` or `zoom()` only after semantic content has declined
the gesture. Engine does not decide which UI, plane or product mode receives an
event.

Renderer converts CSS size to the canvas backing store exactly once through
`pixelRatio`. A legacy single-view frame uses the complete physical backing
width and height for its viewport and scissor; bounded composition uses each
explicit physical rectangle. Camera aspect and document layout stay in
CSS/logical units; consumers never multiply world density by DPR.

A host that owns browser routing constructs `ViewPoint` with
`controls: "host"` and an explicit `ViewPointClientViewport`. Host mode attaches
no listener, reads no global `document`, and mutates no HTML element. The
viewport uses client/CSS coordinates and is the canonical mapping for anchored
zoom; `setViewport()` updates both that mapping and projection aspect. Browser
mode remains the default compatibility behavior for a supplied `element`.

## Bounded Renderer composition

`Renderer.renderComposition()` is the one-canvas multi-view frame boundary. It
accepts one base `Space`/`ViewPoint`, optional foreground `RenderOverlay` roots,
and ordered `RenderBoundedView` entries. Each bounded entry contains an exact
child or descendant `Space`, an independent `ViewPoint`, and one
`RendererPhysicalViewport` in integer physical backing pixels with a top-left
origin. The rectangle must be positive and wholly inside the current backing
store. Duplicate, detached and nested retained-root ownership fails before GPU
submission; ordered viewports may overlap intentionally.

Bounded roots are excluded from base traversal and then submitted once through
their own view. Every view has independent projection/frustum culling,
view/scene uniforms, background, depth and stencil state. Its GPU viewport and
scissor are the exact declared rectangle, and its background is drawn only
inside that rectangle, so preceding pixels outside remain unchanged. Ordered
composition is `base → boundedViews → overlays`; final frame capture copies the
complete result after all views.

One composition uses the same initialized Renderer, canvas context, current
texture, geometry/pipeline caches and final queue submission. It does not create
a Canvas, Renderer, device, requestAnimationFrame loop or input listener.
Browser input priority, pointer capture, scene replacement, resize observation
and demand-driven `requestRender()` ownership remain in the composition host.
Legacy `render()` and `renderFrame()` delegate to this contract with no bounded
views.

## Soft SDF shadow

A rounded interface shadow is analytical presentation of the same local rectangle, not a separate texture or geometric blur ring. One expanded quad evaluates rounded distance and smooth falloff in a single fragment pass. A normal interface shadow does not use an offscreen framebuffer, blur texture, repeated bands, or post-processing.

Source shape size, corner radii, spread, and blur are expressed in local units and continuously inherit the parent's `matrixWorld`. Pure pan or zoom does not rematerialize shadow geometry. Color and opacity are controlled presentation inputs and do not introduce hidden selection state into Engine.

## Rounded rectangle borders

`RoundedRectMaterial.borderWidths` is the canonical local-unit tuple in exact
`[top, right, bottom, left]` order. `borderWidth` remains the uniform authoring
shorthand used by existing consumers: assigning it replaces all four edges;
reading it returns the shared width when the tuple is uniform and `NaN` when no
single width can represent the canonical state.

Uniform widths retain the existing rounded inner-SDF path. Non-uniform widths
are supported only when all four corner radii are zero. That bounded path forms
an exact asymmetric inner rectangle by moving its top, right, bottom and left
bounds independently. Engine keeps one uniform border color; per-edge color is
not implied by per-edge geometry.

Canonical widths are transported in the final previously unused per-object
uniform vec4 at float offsets 60 through 63. Invalid, negative or non-finite
tuples and non-uniform widths combined with rounded corners fail before the
per-object block is changed or submitted. Engine never selects one edge,
averages widths or silently presents a lossy rounded asymmetric border.

## Analytical color picker

`ColorPickerMaterial` draws wheel, value, alpha, and swatch modes with one texture-free quad on a plane. The wheel uses hue, saturation, and a controlled value. The value strip is the same achromatic `white → black` gradient regardless of hue or saturation. Alpha and swatch modes preserve the controlled HSV color and checker composition; correcting one mode does not change packing or presentation for another.

## Partial attribute uploads and instance storage

`BufferAttribute.addUpdateRange(offset, count)` records changed typed-array
elements as sorted, coalesced half-open intervals. Invalid, empty, fractional,
negative, or out-of-bounds intervals fail before dirty state changes. Setting
`needsUpdate = true` remains the explicit full-buffer path and supersedes all
partial intervals; `clearUpdateRanges()` acknowledges either form. More than
64 disjoint intervals promote the attribute to one full upload, bounding
producer-side interval maintenance and queue submission overhead.

Renderer expands partial intervals only to the enclosing four-byte WebGPU
words. While the cached GPU capacity is sufficient and the same attribute
remains attached, it submits only those bounded writes. A new attribute or
insufficient capacity performs one complete upload; replacement succeeds
before the old GPU buffer is destroyed. Dirty state clears only after every
planned queue write succeeds. Each cache binding retains the monotonic
attribute revision it has consumed. If another binding already acknowledged
ranges that an older cache missed, that older cache catches up with one complete
upload rather than applying an incomplete newer interval set.

`InstancedMesh` setters mark only the matrix elements they change. For dynamic
batch owners, `InstanceLayer` provides fixed-stride opaque record bytes and a
separate dense `Uint32` order indirection. Physical slots remain stable;
released slots use a free list and a new generation before reuse, so stale
handles fail closed. Handles are canonical layer-owned identities: copied or
foreign `{slot, generation}` values are rejected. `maxCapacity` is a required
caller bound; eager capacity may start at zero and doubles geometrically without
crossing it. Allocation and record mutation are amortized O(1); order insertion,
removal, and movement are O(n) in the shifted interval.

`InstanceLayer` does not interpret record bytes, allocate per-item `Mesh`
objects, choose a shader, or introduce DOM, UI, Node, and product semantics.
A renderer adapter owns the concrete record layout, binding kind, draw
submission, culling, picking, and GPU-visible interpretation.

`RoundedRectInstanceLayer` is the first concrete Engine presentation ABI over
that generic storage. One layer owns one indexed unit quad, 128-byte records
and the dense order buffer. `InstancedRoundedRect` is only a retained draw-range
view over that shared layer, so scalar barriers can split submission without
duplicating slots or geometry. The packed record contains local rect geometry,
axis-aligned scale/translation, fill/border RGBA, four radii, four border
widths, opacity, analytical shadow blur/spread and local Z. Engine performs one
indexed instanced draw for each view and never allocates a Mesh, geometry or
material per admitted item.

This pipeline intentionally has no presentation-clip binding. A renderer
adapter may admit only items whose exact paint and clipping result it has
proved equivalent; every other item remains on its existing scalar owner.
`RenderFrame.hits` and consumer identity never enter the packed GPU record.

## Plain and skinned meshes

Each visible object submits only its own model and material data. A plain object does not create, clear, or upload bone matrices.

`SkinnedMesh` binds one mesh to one `Skeleton`. Bones and inverse pose matrices form pairs; Renderer consumes only existing pairs and no more than 128 bones. A vertex is first transformed by weighted bone matrices in mesh-local space, then by the mesh world transform. Skeleton animation does not replace the scene position of the mesh itself.

Bone data is uploaded only for `SkinnedMesh`. GPU buffer ownership and upload-range selection belong to Engine; consumers do not reserve or update those resources directly.

## Thin film

`ThinFilmMaterial` presents a closed mesh surface in one transparent pass. Color depends only on the normal, camera position, and material parameters: Fresnel strengthens the edge and bounded spectral interference adds iridescent shift. The material does not read the framebuffer and needs no textures, post-processing, or private animation time.

`rimColor` is the source for edge, reflection, and highlight color. The material never replaces it with a built-in palette.

`highlightSize` controls the angular width of specular highlights. Larger values widen and soften them; smaller values keep them compact. The parameter changes analytical exponents inside the same pass. Peak intensity falls as the highlight widens, so a broader highlight does not add unbounded energy. A value of `0` disables local specular spots while preserving the Fresnel outline and thin-film interference. This rule is independent of shape, screen size, geometric size, and nesting depth.

The transparent film passes the depth test after the opaque scene but does not write depth. Both sides of a closed sphere or torus can therefore participate in one frame, and an unchanged scene does not require a continuous render loop.
