import { Vector2 } from "three";
import { SphericalState } from "./SphericalState";

export class Rotate {
  sphericalState: SphericalState;

  rotateSpeed = 1.0;
  private rotateStart = new Vector2();
  private rotateEnd = new Vector2();
  private rotateDelta = new Vector2();

  vectorMapper: (
    x: number,
    y: number
  ) => readonly [leftAngle: number, upAngle: number];

  constructor(
    sphericalState: SphericalState,
    vectorMapper?: (
      x: number,
      y: number
    ) => readonly [leftAngle: number, upAngle: number]
  ) {
    this.sphericalState = sphericalState;
    this.vectorMapper = vectorMapper ?? ((x, y) => [x, y]);
  }

  private rotateLeft(angle: number): void {
    this.sphericalState.sphericalDelta.theta -= angle;
  }
  private rotateUp(angle: number): void {
    this.sphericalState.sphericalDelta.phi -= angle;
  }

  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  autoRotate = false;
  autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60
  getAutoRotationAngle(): number {
    return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
  }
  updateAutoRotate() {
    if (!this.autoRotate) return;
    this.rotateLeft(this.getAutoRotationAngle());
  }

  enableRotate = true;

  //handlers
  setStart(x: number, y: number) {
    const [leftAngle, upAngle] = this.vectorMapper(x, y);
    this.rotateStart.set(leftAngle, upAngle);
  }

  handleMove(x: number, y: number) {
    const [leftAngle, upAngle] = this.vectorMapper(x, y);

    const delta = this.getDelta(leftAngle, upAngle);
    this.rotateLeft(delta.x);
    this.rotateUp(delta.y);
  }

  private getDelta(x: number, y: number): Vector2 {
    this.rotateEnd.set(x, y);
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);
    this.rotateStart.copy(this.rotateEnd);

    return this.rotateDelta;
  }
}
