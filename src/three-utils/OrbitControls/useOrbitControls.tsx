import {
  EventManager,
  ReactThreeFiber,
  useFrame,
  useThree,
} from "@react-three/fiber";

import { useEffect, useMemo } from "react";
import type { Camera, Event } from "three";
import { OrbitControls as OrbitControlsImpl } from "./OrbitControlsImpl";

export type OrbitControlsProps = {
  camera?: Camera;
  domElement?: HTMLElement;
  onChange?: (e?: Event) => void;
  onEnd?: (e?: Event) => void;
  onStart?: (e?: Event) => void;
  regress?: boolean;
  target?: ReactThreeFiber.Vector3;
};
//enableDaming一旦消した
//makeDefaultは外側からできるはず

function useDomElement(domElement?: HTMLElement) {
  const gl = useThree(({ gl }) => gl);
  const events = useThree(({ events }) => events) as EventManager<HTMLElement>;

  const explDomElement =
    domElement ||
    (typeof events.connected !== "boolean" ? events.connected : gl.domElement);

  return explDomElement;
}
export const useOrbitControls = ({
  camera,
  regress,
  domElement,
  onChange,
  onStart,
  onEnd,
  target,
}: OrbitControlsProps = {}) => {
  const defaultCamera = useThree(({ camera }) => camera);
  const explCamera = camera || defaultCamera;
  const controls = useMemo(
    () => new OrbitControlsImpl(explCamera),
    [explCamera]
  );
  useFrame(() => {
    if (controls.enabled) controls.update();
  });

  const explDomElement = useDomElement(domElement);
  const invalidate = useThree(({ invalidate }) => invalidate);
  const performance = useThree(({ performance }) => performance);
  useEffect(() => {
    const callback = (e: Event) => {
      invalidate();
      if (regress) performance.regress();
      if (onChange) onChange(e);
    };

    controls.connect(explDomElement);
    controls.addEventListener("change", callback);

    if (onStart) controls.addEventListener("start", onStart);
    if (onEnd) controls.addEventListener("end", onEnd);

    return () => {
      controls.removeEventListener("change", callback);
      if (onStart) controls.removeEventListener("start", onStart);
      if (onEnd) controls.removeEventListener("end", onEnd);
      controls.dispose();
    };
  }, [explDomElement, onChange, onStart, onEnd, regress, controls, invalidate]);

  useEffect(() => {
    if (target) {
      if (Array.isArray(target)) {
        controls.target.set(...target);
      } else if (typeof target === "number") {
        controls.target.setScalar(target);
      } else {
        controls.target.copy(target);
      }
    }
  }, [target]);

  return controls;
};
