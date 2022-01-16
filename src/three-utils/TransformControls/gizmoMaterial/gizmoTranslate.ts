import { Line, Mesh, OctahedronGeometry, PlaneGeometry } from "three";
import {
  arrowGeometry,
  matRed,
  lineGeometry,
  matLineRed,
  matGreen,
  matLineGreen,
  matBlue,
  matLineBlue,
  matWhiteTransparent,
  matYellowTransparent,
  matLineYellow,
  matCyanTransparent,
  matLineCyan,
  matMagentaTransparent,
  matLineMagenta,
} from "./utils";

// Gizmo definitions - custom hierarchy definitions for setupGizmo() function
export const gizmoTranslate = {
  X: [
    [
      new Mesh(arrowGeometry, matRed),
      [1, 0, 0],
      [0, 0, -Math.PI / 2],
      null,
      "fwd",
    ],
    [
      new Mesh(arrowGeometry, matRed),
      [1, 0, 0],
      [0, 0, Math.PI / 2],
      null,
      "bwd",
    ],
    [new Line(lineGeometry, matLineRed)],
  ],
  Y: [
    [new Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, "fwd"],
    [
      new Mesh(arrowGeometry, matGreen),
      [0, 1, 0],
      [Math.PI, 0, 0],
      null,
      "bwd",
    ],
    [new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]],
  ],
  Z: [
    [
      new Mesh(arrowGeometry, matBlue),
      [0, 0, 1],
      [Math.PI / 2, 0, 0],
      null,
      "fwd",
    ],
    [
      new Mesh(arrowGeometry, matBlue),
      [0, 0, 1],
      [-Math.PI / 2, 0, 0],
      null,
      "bwd",
    ],
    [new Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0]],
  ],
  XYZ: [
    [
      new Mesh(new OctahedronGeometry(0.1, 0), matWhiteTransparent.clone()),
      [0, 0, 0],
      [0, 0, 0],
    ],
  ],
  XY: [
    [
      new Mesh(new PlaneGeometry(0.295, 0.295), matYellowTransparent.clone()),
      [0.15, 0.15, 0],
    ],
    [
      new Line(lineGeometry, matLineYellow),
      [0.18, 0.3, 0],
      null,
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineYellow),
      [0.3, 0.18, 0],
      [0, 0, Math.PI / 2],
      [0.125, 1, 1],
    ],
  ],
  YZ: [
    [
      new Mesh(new PlaneGeometry(0.295, 0.295), matCyanTransparent.clone()),
      [0, 0.15, 0.15],
      [0, Math.PI / 2, 0],
    ],
    [
      new Line(lineGeometry, matLineCyan),
      [0, 0.18, 0.3],
      [0, 0, Math.PI / 2],
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineCyan),
      [0, 0.3, 0.18],
      [0, -Math.PI / 2, 0],
      [0.125, 1, 1],
    ],
  ],
  XZ: [
    [
      new Mesh(new PlaneGeometry(0.295, 0.295), matMagentaTransparent.clone()),
      [0.15, 0, 0.15],
      [-Math.PI / 2, 0, 0],
    ],
    [
      new Line(lineGeometry, matLineMagenta),
      [0.18, 0, 0.3],
      null,
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineMagenta),
      [0.3, 0, 0.18],
      [0, -Math.PI / 2, 0],
      [0.125, 1, 1],
    ],
  ],
};
