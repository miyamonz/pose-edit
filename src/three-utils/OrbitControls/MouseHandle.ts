import { MOUSE } from "three";
import { STATE } from "./OrbitControlsImpl";
import { Dolly } from "./Dolly";
import { Rotate } from "./Rotate";
import { Pan } from "./Pan";

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

type Control = { dolly: Dolly; rotate: Rotate; pan: Pan };

export class MouseHandle {
  // Mouse buttons
  mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };

  control: Control;
  get dolly() {
    return this.control.dolly;
  }
  get rotate() {
    return this.control.rotate;
  }
  get pan() {
    return this.control.pan;
  }
  constructor(control: Control) {
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
        this.dolly.setStart(event.clientX, event.clientY);
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
    const pos = [event.clientX, event.clientY] as const;
    switch (state) {
      case STATE.ROTATE:
        if (this.rotate.enableRotate === false) return false;
        this.rotate.handleMove(...pos);
        return true;

      case STATE.DOLLY:
        if (this.dolly.enableZoom === false) return false;
        // dolly by y axis
        this.dolly.handleMove(pos[1]);
        return true;

      case STATE.PAN:
        if (this.pan.enablePan === false) return false;
        this.pan.handleMove(...pos);
        return true;
    }
    return false;
  };

  //
  // event callbacks - update the object state
  //

  handleMouseDownRotate = (event: MouseEvent) => {
    this.rotate.setStart(event.clientX, event.clientY);
  };

  handleMouseDownDolly(event: MouseEvent) {
    this.dolly.setStart(event.clientX, event.clientY);
  }

  handleMouseDownPan = (event: MouseEvent) => {
    this.pan.setStart(event.clientX, event.clientY);
  };
}
