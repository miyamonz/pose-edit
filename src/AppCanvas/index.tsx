import * as THREE from "three";
import React from "react";
import { Canvas } from "@react-three/fiber";
import { DefaultXRControllers, VRCanvas } from "@react-three/xr";
// import { VRButton } from "three/examples/jsm/webxr/VRButton";

export const AppCanvas: React.VFC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // get global Store and pass value in order to share between another react renderer
  return (
    <VRCanvas
      dpr={window.devicePixelRatio}
      onCreated={({ gl, scene }) => {
        scene.background = new THREE.Color("#efefef");
        // const button = VRButton.createButton(gl, null);
        // document.body.appendChild(button);
      }}
    >
      {children}
      <DefaultXRControllers />
    </VRCanvas>
  );
};
