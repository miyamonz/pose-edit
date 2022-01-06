import { useState } from "react";
import { Sphere, TransformControls } from "@react-three/drei";

// TODO: 外部オブジェクトに表示する方法を考える
// 前はreact portal使ってたっけ

// 関節操作に関しては、transform controlsのattachとdetachでobjectに繋げば良いはず

export function Joint() {
  const [selected, setSelected] = useState(false);

  return (
    <>
      {selected ? (
        <TransformControls
          mode="rotate"
          space="local"
          size={0.5}
          onPointerMissed={() => setSelected(false)}
        />
      ) : (
        <MySphere onClick={() => setSelected(true)} />
      )}
    </>
  );
}

function MySphere({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false);

  return (
    <Sphere
      onClick={onClick}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={0.08}
    >
      <meshBasicMaterial
        attach="material"
        color={hover ? "hotpink" : "gray"}
        wireframe
      />
    </Sphere>
  );
}
