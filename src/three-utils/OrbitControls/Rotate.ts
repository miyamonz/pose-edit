import { Vector2 } from "three";
import { OrbitControls } from "./OrbitControlsImpl";

export class Rotate {
  control: OrbitControls;

  rotateSpeed = 1.0;
  rotateStart = new Vector2();
  rotateEnd = new Vector2();
  rotateDelta = new Vector2();

  get sphericalDelta() {
    return this.control.sphericalState.sphericalDelta;
  }
  get pointerState() {
    return this.control.pointerState;
  }

  constructor(control: OrbitControls) {
    this.control = control;
  }
  rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }

  rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }

  multiplyDelta() {
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);
  }

  rotateRelativeToElementHeight(height: number) {
    this.rotateLeft((2 * Math.PI * this.rotateDelta.x) / height); // yes, height
    this.rotateUp((2 * Math.PI * this.rotateDelta.y) / height);
  }

  copyEndToStart() {
    this.rotateStart.copy(this.rotateEnd);
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
  handleTouchStartRotate = (pointers: PointerEvent[]) => {
    if (!this.enableRotate) return;

    if (pointers.length == 1) {
      this.rotateStart.set(pointers[0].pageX, pointers[0].pageY);
    } else {
      const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
      const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);

      this.rotateStart.set(x, y);
    }
  };
  handleTouchMoveRotate = (event: PointerEvent, pointers: PointerEvent[]) => {
    if (!this.enableRotate) return;

    if (pointers.length == 1) {
      this.rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.pointerState.getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.rotateEnd.set(x, y);
    }

    this.multiplyDelta();

    const element = this.control.domElement;

    if (element) {
      this.rotateRelativeToElementHeight(element.clientHeight);
    }
    this.copyEndToStart();
  };

  handleMove(x: number, y: number) {
    this.rotateEnd.set(x, y);
    this.multiplyDelta();

    const element = this.control.domElement;
    if (element) {
      this.rotateRelativeToElementHeight(element.clientHeight);
    }
    this.copyEndToStart();
  }
}
