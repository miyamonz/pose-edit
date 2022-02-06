import {
  Matrix4,
  OrthographicCamera,
  PerspectiveCamera,
  Vector2,
  Vector3,
  Camera,
} from "three";

type Control = {
  object: Camera;
  target: Vector3;
  domElement(): HTMLElement | undefined;
};
export class Pan {
  enablePan = true;
  panSpeed = 1.0;
  screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
  keyPanSpeed = 7.0; // pixels moved per arrow key push

  // これがtargetに対するtargetDeltaみたいな役割を持ってる
  panOffset = new Vector3();

  private panStart = new Vector2();
  private panEnd = new Vector2();
  private panDelta = new Vector2();

  control: Control;
  // domElementへの依存は、clientWidthとheightないといい感じにpanできないからまあいいか
  get domElement() {
    return this.control.domElement();
  }
  get object() {
    return this.control.object;
  }
  get target() {
    return this.control.target;
  }

  constructor(control: Control) {
    this.control = control;
  }

  private v = new Vector3();
  // 欲を言えば、カメラの都合に関わるmappingの部分は外から注入できると嬉しいのだが
  // そうすればpanが依存するのはupdate時のtargetだけになる
  // deltaX and deltaY are in pixels; right and down are positive
  pan = (deltaX: number, deltaY: number) => {
    const element = this.domElement;

    if (
      element &&
      this.object instanceof PerspectiveCamera &&
      this.object.isPerspectiveCamera
    ) {
      // perspective
      const offset = this.v.copy(this.object.position).sub(this.target);
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

  private panLeft = (distance: number, objectMatrix: Matrix4) => {
    const v = this.v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
    v.multiplyScalar(-distance);
    this.panOffset.add(v);
  };

  private panUp = (distance: number, objectMatrix: Matrix4) => {
    const v = this.v;
    if (this.screenSpacePanning === true) {
      v.setFromMatrixColumn(objectMatrix, 1);
    } else {
      v.setFromMatrixColumn(objectMatrix, 0);
      v.crossVectors(this.object.up, v);
    }
    v.multiplyScalar(distance);
    this.panOffset.add(v);
  };

  // handlers

  setStart(x: number, y: number) {
    this.panStart.set(x, y);
  }

  handleMove(x: number, y: number) {
    this.panEnd.set(x, y);
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
  }
}

export class Damping {
  enableDamping = true;
  dampingFactor: number;

  constructor(dampingFactor: number) {
    this.dampingFactor = dampingFactor;
  }
  update(target: Vector3, offset: Vector3) {
    const dampingFactor = this.dampingFactor;
    if (this.enableDamping === true) {
      target.addScaledVector(offset, dampingFactor);
      offset.multiplyScalar(1 - dampingFactor);
    } else {
      target.add(offset);
      offset.set(0, 0, 0);
    }
  }
}
