import { Mesh, SphereGeometry, TorusGeometry } from "three";
import { matInvisible } from "./utils";

export const pickerRotate = {
  X: [
    [
      new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
      [0, 0, 0],
      [0, -Math.PI / 2, -Math.PI / 2],
    ],
  ],
  Y: [
    [
      new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    ],
  ],
  Z: [
    [
      new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
      [0, 0, 0],
      [0, 0, -Math.PI / 2],
    ],
  ],
  E: [[new Mesh(new TorusGeometry(1.25, 0.1, 2, 24), matInvisible)]],
  XYZE: [[new Mesh(new SphereGeometry(0.7, 10, 8), matInvisible)]],
};
