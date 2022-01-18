import { OrthographicCamera, PerspectiveCamera, Vector2 } from "three";
import { OrbitControls } from "./OrbitControlsImpl";

export class Dolly {
  dollyStart = new Vector2();
  dollyEnd = new Vector2();
  dollyDelta = new Vector2();

  // How far you can zoom in and out ( OrthographicCamera only )
  minZoom = 0;
  maxZoom = Infinity;

  control: OrbitControls;
  constructor(control: OrbitControls) {
    this.control = control;
  }

  get object() {
    return this.control.object;
  }
  get scale() {
    return this.control.scale;
  }
  set scale(v: number) {
    this.control.scale = v;
  }

  set zoomChanged(b: boolean) {
    this.control.zoomChanged = b;
  }
  set enableZoom(b: boolean) {
    this.control.enableZoom = b;
  }

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
}
