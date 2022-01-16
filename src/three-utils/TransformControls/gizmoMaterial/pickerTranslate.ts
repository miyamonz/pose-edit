import {
  CylinderGeometry,
  Mesh,
  OctahedronGeometry,
  PlaneGeometry,
} from "three";
import { matInvisible } from "./utils";

export const pickerTranslate = {
  X: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
      [0.6, 0, 0],
      [0, 0, -Math.PI / 2],
    ],
  ],
  Y: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
      [0, 0.6, 0],
    ],
  ],
  Z: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
      [0, 0, 0.6],
      [Math.PI / 2, 0, 0],
    ],
  ],
  XYZ: [[new Mesh(new OctahedronGeometry(0.2, 0), matInvisible)]],
  XY: [[new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]]],
  YZ: [
    [
      new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible),
      [0, 0.2, 0.2],
      [0, Math.PI / 2, 0],
    ],
  ],
  XZ: [
    [
      new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible),
      [0.2, 0, 0.2],
      [-Math.PI / 2, 0, 0],
    ],
  ],
};
