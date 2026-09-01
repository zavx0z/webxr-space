import {Badge} from "@ui/components/badge"
import {Button} from "@ui/components/button"
import {Checkbox} from "@ui/components/controls/checkbox"
import {CollectionControl} from "@ui/components/controls/collection-control"
import {ColorControl} from "@ui/components/controls/color-control"
import {ControlGroup} from "@ui/components/controls/control-group"
import {EnumControl} from "@ui/components/controls/enum-control"
import {IntegerControl} from "@ui/components/controls/integer-control"
import {MatrixControl} from "@ui/components/controls/matrix-control"
import {NumberControl} from "@ui/components/controls/number-control"
import {PathControl} from "@ui/components/controls/path-control"
import {ProgressCheckbox} from "@ui/components/controls/progress-checkbox"
import {ReferenceControl} from "@ui/components/controls/reference-control"
import {ReadonlyControl} from "@ui/components/controls/readonly-control"
import {SliderControl} from "@ui/components/controls/slider-control"
import {Switcher} from "@ui/components/controls/switcher"
import {TextControl} from "@ui/components/controls/text-control"
import {VectorControl} from "@ui/components/controls/vector-control"
import {CodeEditor} from "@ui/components/code-editor"
import {Divider} from "@ui/components/divider"
import {BooleanField} from "@ui/components/fields/boolean-field"
import {CollectionField} from "@ui/components/fields/collection-field"
import {ColorField} from "@ui/components/fields/color-field"
import {EnumField} from "@ui/components/fields/enum-field"
import {IntegerField} from "@ui/components/fields/integer-field"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReadonlyField} from "@ui/components/fields/readonly-field"
import {ReferenceField} from "@ui/components/fields/reference-field"
import {RotationField} from "@ui/components/fields/rotation-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {HudFrame, HudWindow, Timeline} from "@ui/components/hud"
import {Inspector} from "@ui/components/inspector"
import {List} from "@ui/components/list"
import {Notification} from "@ui/components/notification"
import {Pane} from "@ui/components/pane"
import {StatusBar} from "@ui/components/status-bar"
import {Table} from "@ui/components/table"
import {Typography} from "@ui/components/typography"

globalThis.__uiFinalOwners = Object.freeze([
  Badge,
  BooleanField,
  Button,
  Checkbox,
  CodeEditor,
  CollectionControl,
  CollectionField,
  ColorControl,
  ColorField,
  ControlGroup,
  Divider,
  EnumControl,
  EnumField,
  HudFrame,
  HudWindow,
  Inspector,
  IntegerControl,
  IntegerField,
  List,
  MatrixControl,
  MatrixField,
  Notification,
  NumberControl,
  NumberField,
  Pane,
  PathControl,
  PathField,
  ProgressCheckbox,
  ReadonlyField,
  ReferenceControl,
  ReadonlyControl,
  ReferenceField,
  RotationField,
  SliderControl,
  StatusBar,
  Switcher,
  Table,
  TextControl,
  TextField,
  Timeline,
  Typography,
  VectorControl,
  VectorField
])

declare global {
  var __uiFinalOwners: readonly unknown[] | undefined
}
