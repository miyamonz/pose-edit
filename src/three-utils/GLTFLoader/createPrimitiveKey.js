import { EXTENSIONS } from "./EXTENSIONS";
import { createAttributesKey } from "./createAttributesKey";

export function createPrimitiveKey(primitiveDef) {
  const dracoExtension =
    primitiveDef.extensions &&
    primitiveDef.extensions[EXTENSIONS.KHR_DRACO_MESH_COMPRESSION];
  let geometryKey;

  if (dracoExtension) {
    geometryKey =
      "draco:" +
      dracoExtension.bufferView +
      ":" +
      dracoExtension.indices +
      ":" +
      createAttributesKey(dracoExtension.attributes);
  } else {
    geometryKey =
      primitiveDef.indices +
      ":" +
      createAttributesKey(primitiveDef.attributes) +
      ":" +
      primitiveDef.mode;
  }

  return geometryKey;
}
