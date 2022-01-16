import { BoxGeometry, CylinderGeometry, Mesh } from "three";
import { matInvisible, scaleHandleGeometry } from "./utils";

export const pickerScale = {
  X: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible),
      [0.5, 0, 0],
      [0, 0, -Math.PI / 2],
    ],
  ],
  Y: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible),
      [0, 0.5, 0],
    ],
  ],
  Z: [
    [
      new Mesh(new CylinderGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible),
      [0, 0, 0.5],
      [Math.PI / 2, 0, 0],
    ],
  ],
  XY: [
    [
      new Mesh(scaleHandleGeometry, matInvisible),
      [0.85, 0.85, 0],
      null,
      [3, 3, 0.2],
    ],
  ],
  YZ: [
    [
      new Mesh(scaleHandleGeometry, matInvisible),
      [0, 0.85, 0.85],
      null,
      [0.2, 3, 3],
    ],
  ],
  XZ: [
    [
      new Mesh(scaleHandleGeometry, matInvisible),
      [0.85, 0, 0.85],
      null,
      [3, 0.2, 3],
    ],
  ],
  XYZX: [[new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [1.1, 0, 0]]],
  XYZY: [[new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [0, 1.1, 0]]],
  XYZZ: [[new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 1.1]]],
};
