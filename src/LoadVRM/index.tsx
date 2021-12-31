import { useGLTF } from "@react-three/drei";
import { VRM } from "@pixiv/three-vrm";
import usePromise from "react-promise-suspense";
import { GLTF } from "three/examples/jsm/loaders/GLTFLoader";

export function LoadVRM({ url }: { url: string }) {
  const vrm = useVRM(url);
  return <primitive object={vrm.scene} />;
}

function useVRM(url: string): VRM {
  const gltf = useGLTF(url);
  return usePromise(loadVRM, [gltf]);
}

async function loadVRM(gltf: GLTF) {
  const vrm = await VRM.from(gltf);
  return vrm;
}
