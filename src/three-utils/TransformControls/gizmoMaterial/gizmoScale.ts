import { BoxGeometry, Line, Mesh } from "three";
import {
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
  scaleHandleGeometry,
} from "./utils";

export const gizmoScale = {
  X: [
    [new Mesh(scaleHandleGeometry, matRed), [0.8, 0, 0], [0, 0, -Math.PI / 2]],
    [new Line(lineGeometry, matLineRed), null, null, [0.8, 1, 1]],
  ],
  Y: [
    [new Mesh(scaleHandleGeometry, matGreen), [0, 0.8, 0]],
    [
      new Line(lineGeometry, matLineGreen),
      null,
      [0, 0, Math.PI / 2],
      [0.8, 1, 1],
    ],
  ],
  Z: [
    [new Mesh(scaleHandleGeometry, matBlue), [0, 0, 0.8], [Math.PI / 2, 0, 0]],
    [
      new Line(lineGeometry, matLineBlue),
      null,
      [0, -Math.PI / 2, 0],
      [0.8, 1, 1],
    ],
  ],
  XY: [
    [
      new Mesh(scaleHandleGeometry, matYellowTransparent),
      [0.85, 0.85, 0],
      null,
      [2, 2, 0.2],
    ],
    [
      new Line(lineGeometry, matLineYellow),
      [0.855, 0.98, 0],
      null,
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineYellow),
      [0.98, 0.855, 0],
      [0, 0, Math.PI / 2],
      [0.125, 1, 1],
    ],
  ],
  YZ: [
    [
      new Mesh(scaleHandleGeometry, matCyanTransparent),
      [0, 0.85, 0.85],
      null,
      [0.2, 2, 2],
    ],
    [
      new Line(lineGeometry, matLineCyan),
      [0, 0.855, 0.98],
      [0, 0, Math.PI / 2],
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineCyan),
      [0, 0.98, 0.855],
      [0, -Math.PI / 2, 0],
      [0.125, 1, 1],
    ],
  ],
  XZ: [
    [
      new Mesh(scaleHandleGeometry, matMagentaTransparent),
      [0.85, 0, 0.85],
      null,
      [2, 0.2, 2],
    ],
    [
      new Line(lineGeometry, matLineMagenta),
      [0.855, 0, 0.98],
      null,
      [0.125, 1, 1],
    ],
    [
      new Line(lineGeometry, matLineMagenta),
      [0.98, 0, 0.855],
      [0, -Math.PI / 2, 0],
      [0.125, 1, 1],
    ],
  ],
  XYZX: [
    [
      new Mesh(
        new BoxGeometry(0.125, 0.125, 0.125),
        matWhiteTransparent.clone()
      ),
      [1.1, 0, 0],
    ],
  ],
  XYZY: [
    [
      new Mesh(
        new BoxGeometry(0.125, 0.125, 0.125),
        matWhiteTransparent.clone()
      ),
      [0, 1.1, 0],
    ],
  ],
  XYZZ: [
    [
      new Mesh(
        new BoxGeometry(0.125, 0.125, 0.125),
        matWhiteTransparent.clone()
      ),
      [0, 0, 1.1],
    ],
  ],
};
