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
        if (this.control.enableZoom === false) return;
        this.handleMouseDownDolly(event);
        this.control.state = STATE.DOLLY;
        break;

      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.control.enablePan === false) return;
          this.handleMouseDownPan(event);
          this.control.state = STATE.PAN;
        } else {
          if (this.control.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          this.control.state = STATE.ROTATE;
        }
        break;

      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.control.enableRotate === false) return;
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
        if (this.control.enableRotate === false) return;
        this.handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (this.control.enableZoom === false) return;
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
    this.control.rotateStart.set(event.clientX, event.clientY);
  };

  handleMouseDownDolly(event: MouseEvent) {
    this.dolly.dollyStart.set(event.clientX, event.clientY);
  }

  handleMouseDownPan = (event: MouseEvent) => {
    this.control.panStart.set(event.clientX, event.clientY);
  };

  handleMouseMoveRotate = (event: MouseEvent) => {
    this.control.rotateEnd.set(event.clientX, event.clientY);
    this.control.rotateDelta
      .subVectors(this.control.rotateEnd, this.control.rotateStart)
      .multiplyScalar(this.control.rotateSpeed);

    const element = this.control.domElement;

    if (element) {
      this.control.rotateLeft(
        (2 * Math.PI * this.control.rotateDelta.x) / element.clientHeight
      ); // yes, height
      this.control.rotateUp(
        (2 * Math.PI * this.control.rotateDelta.y) / element.clientHeight
      );
    }
    this.control.rotateStart.copy(this.control.rotateEnd);
    this.control.update();
  };

  handleMouseMoveDolly = (event: MouseEvent) => {
    this.dolly.dollyEnd.set(event.clientX, event.clientY);
    this.dolly.dollyDelta.subVectors(
      this.dolly.dollyEnd,
      this.dolly.dollyStart
    );

    if (this.dolly.dollyDelta.y > 0) {
      this.dolly.dollyOut(this.control.getZoomScale());
    } else if (this.dolly.dollyDelta.y < 0) {
      this.dolly.dollyIn(this.control.getZoomScale());
    }

    this.dolly.dollyStart.copy(this.dolly.dollyEnd);
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
