import { Pan } from "./Pan";

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
  pan: Pan;
  constructor(pan: Pan) {
    this.pan = pan;
  }
  handleKeyDown = (event: KeyboardEvent) => {
    if (this.pan.enablePan === false) return;

    switch (event.code) {
      case this.keys.UP:
        this.pan.pan(0, this.pan.keyPanSpeed);
        return true;

      case this.keys.BOTTOM:
        this.pan.pan(0, -this.pan.keyPanSpeed);
        return true;
      case this.keys.LEFT:
        this.pan.pan(this.pan.keyPanSpeed, 0);
        return true;
      case this.keys.RIGHT:
        this.pan.pan(-this.pan.keyPanSpeed, 0);
        return true;
    }
    return false;
  };
}
