import { OrthographicCamera, PerspectiveCamera, Vector2 } from "three";
import { OrbitControls } from "./OrbitControlsImpl";

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

    this.control.update();
  };

  handleTouchStartDolly = (pointers: PointerEvent[]) => {
    if (!this.enableZoom) return;

    const dx = pointers[0].pageX - pointers[1].pageX;
    const dy = pointers[0].pageY - pointers[1].pageY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyStart.set(0, distance);
  };

  handleTouchMoveDolly = (event: PointerEvent) => {
    if (!this.enableZoom) return;

    const position = this.control.getSecondPointerPosition(event);
    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyEnd.set(0, distance);
    this.dollyDelta.set(
      0,
      Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed)
    );
    this.dollyOut(this.dollyDelta.y);
    this.dollyStart.copy(this.dollyEnd);
  };

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
}
