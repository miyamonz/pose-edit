import {
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Vector2,
  Vector3,
} from "three";
import { OrbitControls } from "./OrbitControlsImpl";

export class Pan {
  enablePan = true;
  panSpeed = 1.0;
  screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
  keyPanSpeed = 7.0; // pixels moved per arrow key push

  panOffset = new Vector3();

  panStart = new Vector2();
  panEnd = new Vector2();
  panDelta = new Vector2();

  control: OrbitControls;
  get domElement() {
    return this.control.domElement;
  }
  get object() {
    return this.control.object;
  }
  get target() {
    return this.control.target;
  }

  constructor(control: OrbitControls) {
    this.control = control;

    this.pan = (() => {
      // deltaX and deltaY are in pixels; right and down are positive
      const offset = new Vector3();

      return (deltaX: number, deltaY: number) => {
        const element = this.domElement;

        if (
          element &&
          this.object instanceof PerspectiveCamera &&
          this.object.isPerspectiveCamera
        ) {
          // perspective
          const position = this.object.position;
          offset.copy(position).sub(this.target);
          let targetDistance = offset.length();

          // half of the fov is center to top of screen
          targetDistance *= Math.tan(((this.object.fov / 2) * Math.PI) / 180.0);

          // we use only clientHeight here so aspect ratio does not distort speed
          this.panLeft(
            (2 * deltaX * targetDistance) / element.clientHeight,
            this.object.matrix
          );
          this.panUp(
            (2 * deltaY * targetDistance) / element.clientHeight,
            this.object.matrix
          );
        } else if (
          element &&
          this.object instanceof OrthographicCamera &&
          this.object.isOrthographicCamera
        ) {
          // orthographic
          this.panLeft(
            (deltaX * (this.object.right - this.object.left)) /
              this.object.zoom /
              element.clientWidth,
            this.object.matrix
          );
          this.panUp(
            (deltaY * (this.object.top - this.object.bottom)) /
              this.object.zoom /
              element.clientHeight,
            this.object.matrix
          );
        } else {
          // camera neither orthographic nor perspective
          console.warn(
            "WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."
          );
          this.enablePan = false;
        }
      };
    })();
  }
  pan: (deltaX: number, deltaY: number) => void;

  panLeft = (() => {
    const v = new Vector3();
    return (distance: number, objectMatrix: Matrix4) => {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(-distance);

      this.panOffset.add(v);
    };
  })();

  panUp = (() => {
    const v = new Vector3();

    return (distance: number, objectMatrix: Matrix4) => {
      if (this.screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.crossVectors(this.object.up, v);
      }

      v.multiplyScalar(distance);

      this.panOffset.add(v);
    };
  })();

  // handlers

  handleTouchStartPan = (pointers: PointerEvent[]) => {
    if (!this.enablePan) return;

    if (pointers.length == 1) {
      this.panStart.set(pointers[0].pageX, pointers[0].pageY);
    } else {
      const x = 0.5 * (pointers[0].pageX + pointers[1].pageX);
      const y = 0.5 * (pointers[0].pageY + pointers[1].pageY);

      this.panStart.set(x, y);
    }
  };
  handleTouchMovePan = (event: PointerEvent, pointers: PointerEvent[]) => {
    if (!this.enablePan) return;

    if (pointers.length == 1) {
      this.panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.control.getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.panEnd.set(x, y);
    }

    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
  };

  handleMove(x: number, y: number) {
    this.panEnd.set(x, y);
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
  }
}