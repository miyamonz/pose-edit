import { useGLTF } from "@react-three/drei";
import { VRM } from "@pixiv/three-vrm";
import usePromise from "react-promise-suspense";

export function LoadVRM({ url }: { url: string }) {
  const vrm = useVRM(url);
  return <primitive object={vrm.scene} />;
}

export function useVRM(url: string): VRM {
  const gltf = useGLTF(url);
  return usePromise(VRM.from, [gltf]);
}
