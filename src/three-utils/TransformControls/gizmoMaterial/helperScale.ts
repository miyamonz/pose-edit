import { Line } from "three";
import { matHelper, lineGeometry } from "./utils";

export const helperScale = {
  X: [
    [
      new Line(lineGeometry, matHelper.clone()),
      [-1e3, 0, 0],
      null,
      [1e6, 1, 1],
      "helper",
    ],
  ],
  Y: [
    [
      new Line(lineGeometry, matHelper.clone()),
      [0, -1e3, 0],
      [0, 0, Math.PI / 2],
      [1e6, 1, 1],
      "helper",
    ],
  ],
  Z: [
    [
      new Line(lineGeometry, matHelper.clone()),
      [0, 0, -1e3],
      [0, -Math.PI / 2, 0],
      [1e6, 1, 1],
      "helper",
    ],
  ],
};
