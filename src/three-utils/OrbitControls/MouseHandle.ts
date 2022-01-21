import { MOUSE } from "three";
import { OrbitControls, STATE } from "./OrbitControlsImpl";

function getMouseActionFromButton(
  mouseButtons: MouseHandle["mouseButtons"],
  button: number
) {
  switch (button) {
    case 0:
      return mouseButtons.LEFT;

    case 1:
      return mouseButtons.MIDDLE;

    case 2:
      return mouseButtons.RIGHT;

    default:
      return -1;
  }
}

export class MouseHandle {
  // Mouse buttons
  mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };

  control: OrbitControls;
  get dolly() {
    return this.control.dolly;
  }
  get rotate() {
    return this.control.rotate;
  }
  get pan() {
    return this.control.pan;
  }
  constructor(control: OrbitControls) {
    this.control = control;
  }
  onMouseDown = (event: MouseEvent): number | undefined => {
    const mouseAction = getMouseActionFromButton(
      this.mouseButtons,
      event.button
    );

    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.dolly.enableZoom === false) return;
        this.handleMouseDownDolly(event);
        return STATE.DOLLY;

      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.pan.enablePan === false) return;
          this.handleMouseDownPan(event);
          return STATE.PAN;
        } else {
          if (this.rotate.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          return STATE.ROTATE;
        }

      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.rotate.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          return STATE.ROTATE;
        } else {
          if (this.pan.enablePan === false) return;
          this.handleMouseDownPan(event);
          return STATE.PAN;
        }

      default:
        return STATE.NONE;
    }
  };

  onMouseMove = (event: MouseEvent, state: number): boolean => {
    switch (state) {
      case STATE.ROTATE:
        if (this.rotate.enableRotate === false) return false;
        this.handleMouseMoveRotate(event);
        return true;

      case STATE.DOLLY:
        if (this.dolly.enableZoom === false) return false;
        this.handleMouseMoveDolly(event);
        return true;

      case STATE.PAN:
        if (this.pan.enablePan === false) return false;
        this.handleMouseMovePan(event);
        return true;
    }
    return false;
  };

  //
  // event callbacks - update the object state
  //

  handleMouseDownRotate = (event: MouseEvent) => {
    this.rotate.rotateStart.set(event.clientX, event.clientY);
  };

  handleMouseDownDolly(event: MouseEvent) {
    this.dolly.dollyStart.set(event.clientX, event.clientY);
  }

  handleMouseDownPan = (event: MouseEvent) => {
    this.pan.panStart.set(event.clientX, event.clientY);
  };

  handleMouseMoveRotate = (event: MouseEvent) => {
    this.rotate.rotateEnd.set(event.clientX, event.clientY);
    this.rotate.multiplyDelta();

    const element = this.control.domElement;
    if (element) {
      this.rotate.rotateRelativeToElementHeight(element.clientHeight);
    }
    this.rotate.copyEndToStart();
  };

  handleMouseMoveDolly = (event: MouseEvent) => {
    this.dolly.handleMove(event.clientX, event.clientY);
  };

  handleMouseMovePan = (event: MouseEvent) => {
    this.pan.handleMove(event.clientX, event.clientY);
  };
}
