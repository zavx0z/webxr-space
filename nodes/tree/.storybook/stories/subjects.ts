import type {Document} from "@zavx0z/dom"

function defineStory(route: string) {
  return Object.freeze({
    route,
    async create(document: Document) {
      const {createCompiledModelStory} = await import("./compiled-model-story.tsx")
      return createCompiledModelStory(document, route)
    },
  })
}

export const story_model_topology_baseline = defineStory("model/topology/baseline")
export const story_model_scopes_nested = defineStory("model/scopes/nested")
export const story_model_groups_nested = defineStory("model/groups/nested")
export const story_model_snapshots_identity = defineStory("model/snapshots/identity")
export const story_model_lifecycle_dispose = defineStory("model/lifecycle/dispose")
export const story_parameters_store_updates = defineStory("parameters/store/updates")
export const story_parameters_store_shared = defineStory("parameters/store/shared")
export const story_parameters_value_ownership = defineStory("parameters/value/ownership")
export const story_parameters_value_type_validation = defineStory("parameters/value-type/validation")
export const story_parameters_subscriptions_scoped = defineStory("parameters/subscriptions/scoped")
export const story_changes_topology_append = defineStory("changes/topology/append")
export const story_changes_reconcile_identity = defineStory("changes/reconcile/identity")
export const story_changes_reconcile_conflict = defineStory("changes/reconcile/conflict")
export const story_changes_delta_entities = defineStory("changes/delta/entities")
export const story_projections_cache_reuse = defineStory("projections/cache/reuse")
export const story_projections_generation_stale = defineStory("projections/generation/stale")
export const story_templates_node_reference = defineStory("templates/node/reference")
export const story_templates_graph_reference = defineStory("templates/graph/reference")
export const story_serialization_document_roundtrip = defineStory("serialization/document/roundtrip")
export const story_serialization_document_invalid = defineStory("serialization/document/invalid")
export const story_serialization_json_patch_operations = defineStory("serialization/json-patch/operations")
export const story_serialization_json_patch_atomic_error = defineStory("serialization/json-patch/atomic-error")
export const story_validation_links_types = defineStory("validation/links/types")
export const story_validation_topology_cycles = defineStory("validation/topology/cycles")
export const story_validation_topology_references = defineStory("validation/topology/references")
