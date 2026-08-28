import {Badge} from "@ui/components/badge"
import {Button} from "@ui/components/button"
import {Checkbox} from "@ui/components/checkbox"
import {CodeEditor} from "@ui/components/code-editor"
import {CollectionInput} from "@ui/components/collection-input"
import {ColorInput} from "@ui/components/color-input"
import {ControlGroup} from "@ui/components/control-group"
import {Divider} from "@ui/components/divider"
import {EnumInput} from "@ui/components/enum-input"
import {Field} from "@ui/components/field"
import {HudFrame, HudWindow, Timeline} from "@ui/components/hud"
import {Inspector} from "@ui/components/inspector"
import {IntegerInput} from "@ui/components/integer-input"
import {List} from "@ui/components/list"
import {MatrixInput} from "@ui/components/matrix-input"
import {NumberInput} from "@ui/components/number-input"
import {Pane} from "@ui/components/pane"
import {PathInput} from "@ui/components/path-input"
import {ProgressCheckbox} from "@ui/components/progress-checkbox"
import {ReferenceInput} from "@ui/components/reference-input"
import {SliderControl} from "@ui/components/slider-control"
import {Switcher} from "@ui/components/switcher"
import {Table} from "@ui/components/table"
import {TextField} from "@ui/components/text-field"
import {Typography} from "@ui/components/typography"
import {VectorInput} from "@ui/components/vector-input"

globalThis.__uiFinalOwners = Object.freeze([
  Badge,
  Button,
  Checkbox,
  CodeEditor,
  CollectionInput,
  ColorInput,
  ControlGroup,
  Divider,
  EnumInput,
  Field,
  HudFrame,
  HudWindow,
  Inspector,
  IntegerInput,
  List,
  MatrixInput,
  NumberInput,
  Pane,
  PathInput,
  ProgressCheckbox,
  ReferenceInput,
  SliderControl,
  Switcher,
  Table,
  TextField,
  Timeline,
  Typography,
  VectorInput
])

declare global {
  var __uiFinalOwners: readonly unknown[] | undefined
}
