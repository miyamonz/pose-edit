import {
  Camera,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Vector2,
  Vector3,
} from "three";
import { SphericalState } from "./SphericalState";

const EPS = 0.000001;

export class Dolly {
  dollyStart = new Vector2();
  dollyEnd = new Vector2();
  dollyDelta = new Vector2();

  // How far you can zoom in and out ( OrthographicCamera only )
  minZoom = 0;
  maxZoom = Infinity;

  zoomChanged = false;
  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  enableZoom = true;
  zoomSpeed = 1.0;
  getZoomScale(): number {
    return Math.pow(0.95, this.zoomSpeed);
  }

  object: Camera;
  sphericalState: SphericalState;
  constructor(object: Camera, sphericalState: SphericalState) {
    this.object = object;
    this.sphericalState = sphericalState;
  }

  scale = 1;
  dollyOut(dollyScale: number) {
    if (
      this.object instanceof PerspectiveCamera &&
      this.object.isPerspectiveCamera
    ) {
      this.scale /= dollyScale;
    } else if (
      this.object instanceof OrthographicCamera &&
      this.object.isOrthographicCamera
    ) {
      this.object.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.object.zoom * dollyScale)
      );
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn(
        "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
      );
      this.enableZoom = false;
    }
  }

  dollyIn(dollyScale: number) {
    if (
      this.object instanceof PerspectiveCamera &&
      this.object.isPerspectiveCamera
    ) {
      this.scale *= dollyScale;
    } else if (
      this.object instanceof OrthographicCamera &&
      this.object.isOrthographicCamera
    ) {
      this.object.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.object.zoom / dollyScale)
      );
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn(
        "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
      );
      this.enableZoom = false;
    }
  }

  //handlers
  handleMouseWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }
  };

  //TODO: distanceを外から代入する

  startDollyBy2Points(
    p0: { x: number; y: number },
    p1: { x: number; y: number }
  ) {
    const dx = p0.x - p1.x;
    const dy = p0.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyStart.set(0, distance);
  }

  moveDollyBy2Points(
    p0: { x: number; y: number },
    p1: { x: number; y: number }
  ) {
    const dx = p0.x - p1.x;
    const dy = p0.y - p1.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyEnd.set(0, distance);
    this.dollyDelta.set(
      0,
      Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed)
    );
    this.dollyOut(this.dollyDelta.y);
    this.dollyStart.copy(this.dollyEnd);
  }

  handleMove(x: number, y: number) {
    this.dollyEnd.set(x, y);
    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
    if (this.dollyDelta.y > 0) {
      this.dollyOut(this.getZoomScale());
    } else if (this.dollyDelta.y < 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.dollyStart.copy(this.dollyEnd);
  }

  getNextFrameScale() {
    let scale = this.scale;
    this.scale = 1;
    return scale;
  }

  // こっから下、zoomChanged以外はバラバラやな
  lastPosition = new Vector3();
  lastQuaternion = new Quaternion();

  checkZoomed(object: Camera) {
    // update condition is:
    // min(camera displacement, camera rotation in radians)^2 > EPS
    // using small-angle approximation cos(x/2) = 1 - x^2 / 8

    if (
      this.zoomChanged ||
      this.lastPosition.distanceToSquared(object.position) > EPS ||
      8 * (1 - this.lastQuaternion.dot(object.quaternion)) > EPS
    ) {
      this.lastPosition.copy(object.position);
      this.lastQuaternion.copy(object.quaternion);
      this.zoomChanged = false;
      return true;
    }
    return false;
  }
}
