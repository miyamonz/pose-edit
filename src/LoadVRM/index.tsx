import { useGLTF } from "@react-three/drei";
import { VRM, VRMSchema } from "@pixiv/three-vrm";
import usePromise from "react-promise-suspense";
import { Joint } from "../Joint";

function isNotNullish<T>(value: T): value is NonNullable<typeof value> {
  return value !== null && value !== undefined;
}

export function LoadVRM({ url }: { url: string }) {
  const vrm = useVRM(url);
  const bones = Object.values(VRMSchema.HumanoidBoneName)
    .map((name) => vrm.humanoid?.getBoneNode(name))
    .filter(isNotNullish);
  return (
    <>
      <primitive object={vrm.scene} />
      {bones.map((bone) => (
        <Joint key={bone.name} object={bone} />
      ))}
    </>
  );
}

export function useVRM(url: string): VRM {
  const gltf = useGLTF(url);
  return usePromise(VRM.from, [gltf]);
}
