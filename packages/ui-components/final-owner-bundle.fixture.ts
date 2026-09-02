import {Badge} from "@ui/components/badge"
import {Button, IconButton} from "@ui/components/button"
import {CodeEditor} from "@ui/components/code-editor"
import {Divider} from "@ui/components/divider"
import {CheckboxField} from "@ui/components/fields/checkbox-field"
import {CollectionField} from "@ui/components/fields/collection-field"
import {ColorField} from "@ui/components/fields/color-field"
import {ColorPickerField} from "@ui/components/fields/color-picker-field"
import {CycleField} from "@ui/components/fields/cycle-field"
import {FieldGroup} from "@ui/components/fields/field-group"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {OptionGroupField} from "@ui/components/fields/option-group-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReferenceField} from "@ui/components/fields/reference-field"
import {SelectField} from "@ui/components/fields/select-field"
import {SliderField} from "@ui/components/fields/slider-field"
import {SwitchField} from "@ui/components/fields/switch-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {HudFrame, HudWindow, Timeline} from "@ui/components/hud"
import {Inspector} from "@ui/components/inspector"
import {List} from "@ui/components/list"
import {Notification} from "@ui/components/notification"
import {Pane} from "@ui/components/pane"
import {Panel} from "@ui/components/panel"
import {StatusBar} from "@ui/components/status-bar"
import {Table} from "@ui/components/table"
import {Typography} from "@ui/components/typography"

globalThis.__uiFinalOwners = Object.freeze([
  Badge,
  Button,
  IconButton,
  CheckboxField,
  CodeEditor,
  CollectionField,
  ColorField,
  ColorPickerField,
  CycleField,
  Divider,
  FieldGroup,
  HudFrame,
  HudWindow,
  Inspector,
  List,
  MatrixField,
  Notification,
  NumberField,
  OptionGroupField,
  Pane,
  Panel,
  PathField,
  ReferenceField,
  SelectField,
  SliderField,
  StatusBar,
  SwitchField,
  Table,
  TextField,
  Timeline,
  Typography,
  VectorField
])

declare global {
  var __uiFinalOwners: readonly unknown[] | undefined
}
