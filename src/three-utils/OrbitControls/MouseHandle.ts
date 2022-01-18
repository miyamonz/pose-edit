import { MOUSE } from "three";
import { OrbitControls, STATE, startEvent } from "./OrbitControlsImpl";

function getMouseActionFromButton(
  mouseButtons: OrbitControls["mouseButtons"],
  button: number
) {
  switch (button) {
    case 0:
      return mouseButtons.LEFT;

    case 1:
      return mouseButtons.MIDDLE;
      break;

    case 2:
      return mouseButtons.RIGHT;

    default:
      return -1;
  }
}

export class MouseHandle {
  control: OrbitControls;
  get dolly() {
    return this.control.dolly;
  }
  get rotate() {
    return this.control.rotate;
  }
  constructor(control: OrbitControls) {
    this.control = control;
  }
  onMouseDown = (event: MouseEvent) => {
    const mouseAction = getMouseActionFromButton(
      this.control.mouseButtons,
      event.button
    );

    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.dolly.enableZoom === false) return;
        this.handleMouseDownDolly(event);
        this.control.state = STATE.DOLLY;
        break;

      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.control.enablePan === false) return;
          this.handleMouseDownPan(event);
          this.control.state = STATE.PAN;
        } else {
          if (this.rotate.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          this.control.state = STATE.ROTATE;
        }
        break;

      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.rotate.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          this.control.state = STATE.ROTATE;
        } else {
          if (this.control.enablePan === false) return;
          this.handleMouseDownPan(event);
          this.control.state = STATE.PAN;
        }
        break;

      default:
        this.control.state = STATE.NONE;
    }

    if (this.control.state !== STATE.NONE) {
      this.control.dispatchEvent(startEvent);
    }
  };

  onMouseMove = (event: MouseEvent) => {
    if (this.control.enabled === false) return;

    switch (this.control.state) {
      case STATE.ROTATE:
        if (this.rotate.enableRotate === false) return;
        this.handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (this.dolly.enableZoom === false) return;
        this.handleMouseMoveDolly(event);
        break;

      case STATE.PAN:
        if (this.control.enablePan === false) return;
        this.handleMouseMovePan(event);
        break;
    }
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
    this.control.panStart.set(event.clientX, event.clientY);
  };

  handleMouseMoveRotate = (event: MouseEvent) => {
    this.rotate.rotateEnd.set(event.clientX, event.clientY);

    this.rotate.multiplyDelta();

    const element = this.control.domElement;

    if (element) {
      this.rotate.rotateRelativeToElementHeight(element.clientHeight);
    }
    this.rotate.copyEndToStart();
    this.control.update();
  };

  handleMouseMoveDolly = (event: MouseEvent) => {
    this.dolly.handleMove(event.clientX, event.clientY);
    this.control.update();
  };

  handleMouseMovePan = (event: MouseEvent) => {
    this.control.panEnd.set(event.clientX, event.clientY);
    this.control.panDelta
      .subVectors(this.control.panEnd, this.control.panStart)
      .multiplyScalar(this.control.panSpeed);
    this.control.pan(this.control.panDelta.x, this.control.panDelta.y);
    this.control.panStart.copy(this.control.panEnd);
    this.control.update();
  };
}
