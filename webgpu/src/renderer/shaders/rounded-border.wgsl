// Inner border contour for independent CSS edge widths. An outer circular
// corner becomes an ellipse after independent horizontal/vertical insets.
fn roundedInnerDistance(point: vec2<f32>, halfSize: vec2<f32>, radii: vec4<f32>, widths: vec4<f32>) -> f32 {
    let lower = -halfSize + vec2<f32>(widths.w, widths.z);
    let upper = halfSize - vec2<f32>(widths.y, widths.x);
    let size = upper - lower;
    if (any(size <= vec2<f32>(0.0))) { return 1e20; }
    var rx = max(radii - vec4<f32>(widths.w, widths.y, widths.y, widths.w), vec4<f32>(0.0));
    var ry = max(radii - vec4<f32>(widths.x, widths.x, widths.z, widths.z), vec4<f32>(0.0));
    let fit = min(1.0, min(
        min(size.x / max(rx.x + rx.y, 0.00001), size.x / max(rx.w + rx.z, 0.00001)),
        min(size.y / max(ry.x + ry.w, 0.00001), size.y / max(ry.y + ry.z, 0.00001))
    ));
    rx *= fit;
    ry *= fit;
    let edge = max(lower - point, point - upper);
    let rectangle = max(edge.x, edge.y);
    var radius = vec2<f32>(0.0);
    var center = vec2<f32>(0.0);
    if (point.x < lower.x + rx.x && point.y > upper.y - ry.x) {
        radius = vec2<f32>(rx.x, ry.x);
        center = vec2<f32>(lower.x + rx.x, upper.y - ry.x);
    } else if (point.x > upper.x - rx.y && point.y > upper.y - ry.y) {
        radius = vec2<f32>(rx.y, ry.y);
        center = vec2<f32>(upper.x - rx.y, upper.y - ry.y);
    } else if (point.x > upper.x - rx.z && point.y < lower.y + ry.z) {
        radius = vec2<f32>(rx.z, ry.z);
        center = vec2<f32>(upper.x - rx.z, lower.y + ry.z);
    } else if (point.x < lower.x + rx.w && point.y < lower.y + ry.w) {
        radius = vec2<f32>(rx.w, ry.w);
        center = vec2<f32>(lower.x + rx.w, lower.y + ry.w);
    }
    if (all(radius > vec2<f32>(0.0))) {
        return max(rectangle, (length((point - center) / radius) - 1.0) * min(radius.x, radius.y));
    }
    return rectangle;
}
