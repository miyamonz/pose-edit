import {
  Camera,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";
import { SphericalState } from "./SphericalState";

const EPS = 0.000001;

export class Dolly {
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
    this.dollyOut(1 / dollyScale);
  }

  //handlers
  handleMouseWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }
  };

  setStart(x: number, y: number) {
    this.start = y;
  }

  startDollyByDistance(distance: number) {
    this.start = distance;
  }

  // これと１つ下の２つのmethodは、入力に対してどういうふうにzoomをするのかという利用側のロジックが入ってしまっている
  dollyByDistance(distance: number) {
    const [prev, next] = this.diff(distance);

    const deltaY = Math.pow(next / prev, this.zoomSpeed);
    this.dollyOut(deltaY);
  }

  handleMove(y: number) {
    const [prev, next] = this.diff(y);

    const deltaY = next - prev;
    if (deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    } else if (deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    }
  }

  private start = 0;
  private diff(v: number) {
    const [prev, next] = [this.start, v];
    this.start = next;
    return [prev, next];
  }

  // 平行投影だったらcameraのzoomを変えるが、そうでなければdollyはこのscale操作ですべてやってる
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
