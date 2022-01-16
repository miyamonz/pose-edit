import { Line, Mesh, OctahedronGeometry } from "three";
import { matHelper, TranslateHelperGeometry, lineGeometry } from "./utils";

export const helperTranslate = {
  START: [
    [
      new Mesh(new OctahedronGeometry(0.01, 2), matHelper),
      null,
      null,
      null,
      "helper",
    ],
  ],
  END: [
    [
      new Mesh(new OctahedronGeometry(0.01, 2), matHelper),
      null,
      null,
      null,
      "helper",
    ],
  ],
  DELTA: [
    [
      new Line(TranslateHelperGeometry(), matHelper),
      null,
      null,
      null,
      "helper",
    ],
  ],
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
