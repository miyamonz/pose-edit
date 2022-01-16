import { Line } from "three";
import { matHelper, lineGeometry } from "./utils";

export const helperRotate = {
  AXIS: [
    [
      new Line(lineGeometry, matHelper.clone()),
      [-1e3, 0, 0],
      null,
      [1e6, 1, 1],
      "helper",
    ],
  ],
};
