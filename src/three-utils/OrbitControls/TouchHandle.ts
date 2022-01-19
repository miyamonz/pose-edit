import { TOUCH } from "three";
import { OrbitControls, STATE, startEvent } from "./OrbitControlsImpl";

export class TouchHandle {
  control: OrbitControls;

  // Touch fingers
  touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };

  get rotate() {
    return this.control.rotate;
  }
  get dolly() {
    return this.control.dolly;
  }
  get pan() {
    return this.control.pan;
  }
  constructor(control: OrbitControls) {
    this.control = control;
  }

  onTouchStart = (event: PointerEvent, pointers: PointerEvent[]) => {
    this.trackPointer(event);

    switch (pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.rotate.enableRotate === false) return;
            this.rotate.handleTouchStartRotate(pointers);
            this.state = STATE.TOUCH_ROTATE;
            break;

          case TOUCH.PAN:
            if (this.pan.enablePan === false) return;
            this.pan.handleTouchStartPan(pointers);
            this.state = STATE.TOUCH_PAN;
            break;

          default:
            this.state = STATE.NONE;
        }

        break;

      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.dolly.enableZoom === false && this.pan.enablePan === false)
              return;
            this.handleTouchStartDollyPan();
            this.state = STATE.TOUCH_DOLLY_PAN;
            break;

          case TOUCH.DOLLY_ROTATE:
            if (
              this.dolly.enableZoom === false &&
              this.rotate.enableRotate === false
            )
              return;
            this.handleTouchStartDollyRotate();
            this.state = STATE.TOUCH_DOLLY_ROTATE;
            break;

          default:
            this.state = STATE.NONE;
        }

        break;

      default:
        this.state = STATE.NONE;
    }

    if (this.state !== STATE.NONE) {
      this.dispatchEvent(startEvent);
    }
  };

  onTouchMove = (event: PointerEvent, pointers: PointerEvent[]) => {
    this.trackPointer(event);

    switch (this.state) {
      case STATE.TOUCH_ROTATE:
        if (this.rotate.enableRotate === false) return;
        this.rotate.handleTouchMoveRotate(event, pointers);
        this.update();
        break;

      case STATE.TOUCH_PAN:
        if (this.pan.enablePan === false) return;
        this.pan.handleTouchMovePan(event, pointers);
        this.update();
        break;

      case STATE.TOUCH_DOLLY_PAN:
        if (this.dolly.enableZoom === false && this.pan.enablePan === false)
          return;
        this.handleTouchMoveDollyPan(event);
        this.update();
        break;

      case STATE.TOUCH_DOLLY_ROTATE:
        if (
          this.dolly.enableZoom === false &&
          this.rotate.enableRotate === false
        )
          return;
        this.handleTouchMoveDollyRotate(event);
        this.update();
        break;

      default:
        this.state = STATE.NONE;
    }
  };
}
