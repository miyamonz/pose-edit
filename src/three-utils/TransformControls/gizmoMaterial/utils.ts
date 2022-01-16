import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  LineBasicMaterial,
  MeshBasicMaterial,
} from "three";

const gizmoMaterial = new MeshBasicMaterial({
  depthTest: false,
  depthWrite: false,
  transparent: true,
  side: DoubleSide,
  fog: false,
  toneMapped: false,
});
const gizmoLineMaterial = new LineBasicMaterial({
  depthTest: false,
  depthWrite: false,
  transparent: true,
  linewidth: 1,
  fog: false,
  toneMapped: false,
});
// Make unique material for each axis/color
export const matInvisible = gizmoMaterial.clone();
matInvisible.opacity = 0.15;
export const matHelper = gizmoMaterial.clone();
matHelper.opacity = 0.33;
export const matRed = gizmoMaterial.clone() as MeshBasicMaterial;
matRed.color.set(0xff0000);
export const matGreen = gizmoMaterial.clone() as MeshBasicMaterial;
matGreen.color.set(0x00ff00);
export const matBlue = gizmoMaterial.clone() as MeshBasicMaterial;
matBlue.color.set(0x0000ff);
export const matWhiteTransparent = gizmoMaterial.clone() as MeshBasicMaterial;
matWhiteTransparent.opacity = 0.25;
export const matYellowTransparent =
  matWhiteTransparent.clone() as MeshBasicMaterial;
matYellowTransparent.color.set(0xffff00);
export const matCyanTransparent =
  matWhiteTransparent.clone() as MeshBasicMaterial;
matCyanTransparent.color.set(0x00ffff);
export const matMagentaTransparent =
  matWhiteTransparent.clone() as MeshBasicMaterial;
matMagentaTransparent.color.set(0xff00ff);
const matYellow = gizmoMaterial.clone() as MeshBasicMaterial;
matYellow.color.set(0xffff00);

export const matLineRed = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineRed.color.set(0xff0000);
export const matLineGreen = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineGreen.color.set(0x00ff00);
export const matLineBlue = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineBlue.color.set(0x0000ff);
export const matLineCyan = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineCyan.color.set(0x00ffff);
export const matLineMagenta = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineMagenta.color.set(0xff00ff);
export const matLineYellow = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineYellow.color.set(0xffff00);
export const matLineGray = gizmoLineMaterial.clone() as LineBasicMaterial;
matLineGray.color.set(0x787878);
export const matLineYellowTransparent =
  matLineYellow.clone() as LineBasicMaterial;
matLineYellowTransparent.opacity = 0.25;
export const lineGeometry = new BufferGeometry();
lineGeometry.setAttribute(
  "position",
  new Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
);
export const CircleGeometry = (radius: number, arc: number): BufferGeometry => {
  const geometry = new BufferGeometry();
  const vertices = [];

  for (let i = 0; i <= 64 * arc; ++i) {
    vertices.push(
      0,
      Math.cos((i / 32) * Math.PI) * radius,
      Math.sin((i / 32) * Math.PI) * radius
    );
  }

  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

  return geometry;
};
// Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position
export const TranslateHelperGeometry = (): BufferGeometry => {
  const geometry = new BufferGeometry();

  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3)
  );

  return geometry;
};
// reusable geometry
export const arrowGeometry = new CylinderGeometry(0, 0.05, 0.2, 12, 1, false);
export const scaleHandleGeometry = new BoxGeometry(0.125, 0.125, 0.125);
