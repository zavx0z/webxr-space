import { Object3D } from "../core/object-3d";
import { Mesh } from "../core/mesh";
import { PlaneGeometry } from "../geometries/plane-geometry";
import { GlassMaterial } from "../materials/glass-material";
import type { LayoutProps } from "../layout/layout-types";

export class GlassPanel extends Object3D {
    public override layout: LayoutProps;
    private mesh: Mesh;

    constructor(layoutProps: LayoutProps) {
        super();
        this.name = 'GlassPanel';
        this.layout = layoutProps;

        const geometry = new PlaneGeometry({ width: 1, height: 1 });
        const material = new GlassMaterial();
        this.mesh = new Mesh(geometry, material);
        this.add(this.mesh);
    }
}
