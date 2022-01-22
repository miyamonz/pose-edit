import { Vector2 } from "three";
import { OrbitControls } from "./OrbitControlsImpl";

export class Rotate {
  control: OrbitControls;

  rotateSpeed = 1.0;
  private rotateStart = new Vector2();
  private rotateEnd = new Vector2();
  private rotateDelta = new Vector2();

  get sphericalDelta() {
    return this.control.sphericalState.sphericalDelta;
  }

  vectorMapper: (
    x: number,
    y: number
  ) => readonly [leftAngle: number, upAngle: number];

  constructor(
    control: OrbitControls,
    vectorMapper?: (
      x: number,
      y: number
    ) => readonly [leftAngle: number, upAngle: number]
  ) {
    this.control = control;
    this.vectorMapper = vectorMapper ?? ((x, y) => [x, y]);
  }

  private rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }
  private rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
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

    this.rotateEnd.set(leftAngle, upAngle);
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);

    this.rotateLeft(this.rotateDelta.x);
    this.rotateUp(this.rotateDelta.y);

    this.rotateStart.copy(this.rotateEnd);
  }
}
