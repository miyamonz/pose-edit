import { CylinderGeometry, Line, Mesh, OctahedronGeometry } from "three";
import {
  matRed,
  matLineRed,
  matGreen,
  matLineGreen,
  matBlue,
  matLineBlue,
  CircleGeometry,
  matLineYellowTransparent,
  matLineGray,
} from "./utils";

export const gizmoRotate = {
  X: [
    [new Line(CircleGeometry(1, 0.5), matLineRed)],
    [
      new Mesh(new OctahedronGeometry(0.04, 0), matRed),
      [0, 0, 0.99],
      null,
      [1, 3, 1],
    ],
  ],
  Y: [
    [
      new Line(CircleGeometry(1, 0.5), matLineGreen),
      null,
      [0, 0, -Math.PI / 2],
    ],
    [
      new Mesh(new OctahedronGeometry(0.04, 0), matGreen),
      [0, 0, 0.99],
      null,
      [3, 1, 1],
    ],
  ],
  Z: [
    [new Line(CircleGeometry(1, 0.5), matLineBlue), null, [0, Math.PI / 2, 0]],
    [
      new Mesh(new OctahedronGeometry(0.04, 0), matBlue),
      [0.99, 0, 0],
      null,
      [1, 3, 1],
    ],
  ],
  E: [
    [
      new Line(CircleGeometry(1.25, 1), matLineYellowTransparent),
      null,
      [0, Math.PI / 2, 0],
    ],
    [
      new Mesh(
        new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
        matLineYellowTransparent
      ),
      [1.17, 0, 0],
      [0, 0, -Math.PI / 2],
      [1, 1, 0.001],
    ],
    [
      new Mesh(
        new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
        matLineYellowTransparent
      ),
      [-1.17, 0, 0],
      [0, 0, Math.PI / 2],
      [1, 1, 0.001],
    ],
    [
      new Mesh(
        new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
        matLineYellowTransparent
      ),
      [0, -1.17, 0],
      [Math.PI, 0, 0],
      [1, 1, 0.001],
    ],
    [
      new Mesh(
        new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
        matLineYellowTransparent
      ),
      [0, 1.17, 0],
      [0, 0, 0],
      [1, 1, 0.001],
    ],
  ],
  XYZE: [
    [new Line(CircleGeometry(1, 1), matLineGray), null, [0, Math.PI / 2, 0]],
  ],
};
