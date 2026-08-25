const PRESENTATION_CLIP_MARKER = "// @engine-presentation-clip"

const PRESENTATION_CLIP_WGSL = /* wgsl */ `
struct PresentationClipRecord {
    worldToLocal: mat4x4<f32>,
    geometry: vec4<f32>,
    radii: vec4<f32>,
};
@binding(2) @group(1) var<storage, read> presentationClipRecords: array<PresentationClipRecord>;

fn presentationClipSdRoundBox(p: vec2<f32>, halfSize: vec2<f32>, radii: vec4<f32>) -> f32 {
    var radius: f32;
    if (p.x <= 0.0 && p.y > 0.0) { radius = radii.x; }
    else if (p.x > 0.0 && p.y > 0.0) { radius = radii.y; }
    else if (p.x > 0.0 && p.y <= 0.0) { radius = radii.z; }
    else { radius = radii.w; }
    let q = abs(p) - halfSize + vec2<f32>(radius);
    return min(max(q.x, q.y), 0.0) + length(max(q, vec2<f32>(0.0))) - radius;
}

fn presentationClipCoverage(worldPosition: vec3<f32>, range: vec4<f32>) -> f32 {
    let start = u32(max(range.x, 0.0));
    let count = u32(max(range.y, 0.0));
    var coverage = 1.0;
    for (var offset = 0u; offset < count; offset += 1u) {
        let clip = presentationClipRecords[start + offset];
        let halfSize = clip.geometry.zw;
        if (halfSize.x <= 0.0 || halfSize.y <= 0.0) {
            return 0.0;
        }
        let localPosition = clip.worldToLocal * vec4<f32>(worldPosition, 1.0);
        let distance = presentationClipSdRoundBox(
            localPosition.xy - clip.geometry.xy,
            halfSize,
            clip.radii,
        );
        let antialias = max(fwidth(distance), 0.000001);
        coverage = min(coverage, 1.0 - smoothstep(-antialias, antialias, distance));
    }
    return coverage;
}
`

export function composePresentationClipShader(source: string): string {
  const first = source.indexOf(PRESENTATION_CLIP_MARKER)
  if (first < 0 || source.indexOf(PRESENTATION_CLIP_MARKER, first + PRESENTATION_CLIP_MARKER.length) >= 0) {
    throw new Error("A presentation-clipped shader must contain exactly one presentation clip marker")
  }
  return source.replace(PRESENTATION_CLIP_MARKER, PRESENTATION_CLIP_WGSL)
}
