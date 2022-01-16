import { useState } from "react";
import { Sphere } from "@react-three/drei";
import { TransformControls } from "../three-utils/TransformControls";
import { createPortal } from "@react-three/fiber";
import { Object3D } from "three";
import { atom, useAtom } from "jotai";

const selectedAtom = atom("");

export function Joint({ object }: { object: Object3D }) {
  const [selected, setSelected] = useState(false);

  const [selectedObjectId, setSelectedObjectId] = useAtom(selectedAtom);

  const somthingSelected = selectedObjectId !== "";
  // if (somthingSelected && !selected) return null;

  return (
    <>
      {selected ? (
        <TransformControls
          mode="rotate"
          space="local"
          size={0.5}
          object={object}
          onPointerMissed={() => {
            setSelected(false);
            setSelectedObjectId("");
          }}
        />
      ) : (
        createPortal(
          <MySphere
            onClick={() => {
              setSelected(true);
              setSelectedObjectId(object.uuid);
            }}
          />,
          object
        )
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
