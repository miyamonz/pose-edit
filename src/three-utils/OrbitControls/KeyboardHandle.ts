import { OrbitControls } from "./OrbitControlsImpl";

export class KeyboardHandle {
  // Set to false to disable panning
  // Set to true to automatically rotate around the target
  // The four arrow keys
  keys = {
    LEFT: "ArrowLeft",
    UP: "ArrowUp",
    RIGHT: "ArrowRight",
    BOTTOM: "ArrowDown",
  };
  control: OrbitControls;
  get pan() {
    return this.control.pan;
  }
  constructor(control: OrbitControls) {
    this.control = control;
  }
  handleKeyDown = (event: KeyboardEvent) => {
    if (this.pan.enablePan === false) return;
    let needsUpdate = false;

    switch (event.code) {
      case this.keys.UP:
        this.pan.pan(0, this.pan.keyPanSpeed);
        needsUpdate = true;
        break;

      case this.keys.BOTTOM:
        this.pan.pan(0, -this.pan.keyPanSpeed);
        needsUpdate = true;
        break;

      case this.keys.LEFT:
        this.pan.pan(this.pan.keyPanSpeed, 0);
        needsUpdate = true;
        break;

      case this.keys.RIGHT:
        this.pan.pan(-this.pan.keyPanSpeed, 0);
        needsUpdate = true;
        break;
    }

    return needsUpdate;
  };
}
