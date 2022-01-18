import { ATTRIBUTES } from "./CONSTANTS";
import { assignExtrasToUserData } from "./assignExtrasToUserData";
import { addMorphTargets } from "./addMorphTargets";
import { computeBounds } from "./computeBounds";

/**
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */

export function addPrimitiveAttributes(geometry, primitiveDef, parser) {
  const attributes = primitiveDef.attributes;

  const pending = [];

  function assignAttributeAccessor(accessorIndex, attributeName) {
    return parser
      .getDependency("accessor", accessorIndex)
      .then(function (accessor) {
        geometry.setAttribute(attributeName, accessor);
      });
  }

  for (const gltfAttributeName in attributes) {
    const threeAttributeName =
      ATTRIBUTES[gltfAttributeName] || gltfAttributeName.toLowerCase();

    // Skip attributes already provided by e.g. Draco extension.
    if (threeAttributeName in geometry.attributes) continue;

    pending.push(
      assignAttributeAccessor(attributes[gltfAttributeName], threeAttributeName)
    );
  }

  if (primitiveDef.indices !== undefined && !geometry.index) {
    const accessor = parser
      .getDependency("accessor", primitiveDef.indices)
      .then(function (accessor) {
        geometry.setIndex(accessor);
      });

    pending.push(accessor);
  }

  assignExtrasToUserData(geometry, primitiveDef);

  computeBounds(geometry, primitiveDef, parser);

  return Promise.all(pending).then(function () {
    return primitiveDef.targets !== undefined
      ? addMorphTargets(geometry, primitiveDef.targets, parser)
      : geometry;
  });
}
