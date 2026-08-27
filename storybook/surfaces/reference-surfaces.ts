import {Color} from "@engine/core"
import {Typography} from "@ui/components/typography"
import {flexRow} from "@layout/core/flex"
import {UiSurface, Z} from "@layout/core/surface"
import {palette} from "@ui/elements/theme"
import {storybookPublicPath} from "@zavx0z/storybook/environment"
export const ACCEPTED_REFERENCE_SRC = typeof document === "undefined"
  ? "/references/blender-4.5.5-reference.png"
  : storybookPublicPath("node", "/references/blender-4.5.5-reference.png", document)

export class AcceptedReferenceSurface extends UiSurface {
  constructor() {
    super({bgColor: null, borderColor: null})
    this.setBackgroundImage({
      src: ACCEPTED_REFERENCE_SRC,
      fit: "cover",
      opacity: 1,
      scale: 0.98,
      viewBox: {x: 0, y: 0.42, w: 0.65, h: 0.38},
    })
    this.node.name = "AcceptedReferenceSurface"
  }

  protected override render(): void {
    this.drawRoundedRect(0, 0, this.rectW, this.rectH, {
      radius: 10,
      fill: new Color(0, 0, 0, 0),
      border: palette.border,
      borderWidth: 1,
      z: Z.CONTAINER,
    })
    this.drawRoundedRect(0, 0, this.rectW, 30, {
      radius: 10,
      fill: new Color(0.035, 0.04, 0.05, 0.88),
      border: null,
      z: Z.ELEMENT,
    })
    flexRow({
      x: 0,
      y: 0,
      w: this.rectW,
      h: 30,
      paddingX: 12,
      alignItems: "center",
      items: [{
        width: "grow",
        height: 24,
        draw: (x, y, w, h) => Typography(this, x, y, w, h, {
          children: "ПРИНЯТЫЙ ЭТАЛОН",
          variant: "caption",
          color: "muted",
        }),
      }],
    })
  }
}
