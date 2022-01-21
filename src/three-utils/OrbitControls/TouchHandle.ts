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

  onTouchStart = (pointers: PointerEvent[]): number | undefined => {
    switch (pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.rotate.enableRotate === false) return;
            this.rotate.handleTouchStartRotate(pointers);
            return STATE.TOUCH_ROTATE;

          case TOUCH.PAN:
            if (this.pan.enablePan === false) return;
            this.pan.handleTouchStartPan(pointers);
            return STATE.TOUCH_PAN;

          default:
            return STATE.NONE;
        }

      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.dolly.enableZoom === false && this.pan.enablePan === false)
              return;
            this.handleTouchStartDollyPan(pointers);
            return STATE.TOUCH_DOLLY_PAN;

          case TOUCH.DOLLY_ROTATE:
            if (
              this.dolly.enableZoom === false &&
              this.rotate.enableRotate === false
            )
              return;
            this.handleTouchStartDollyRotate(pointers);
            return STATE.TOUCH_DOLLY_ROTATE;

          default:
            return STATE.NONE;
        }

      default:
        return STATE.NONE;
    }
  };

  onTouchMove = (
    event: PointerEvent,
    pointers: PointerEvent[],
    state: number
  ): boolean => {
    switch (state) {
      case STATE.TOUCH_ROTATE:
        if (this.rotate.enableRotate === false) return false;
        this.rotate.handleTouchMoveRotate(event, pointers);
        return true;

      case STATE.TOUCH_PAN:
        if (this.pan.enablePan === false) return false;
        this.pan.handleTouchMovePan(event, pointers);
        return true;

      case STATE.TOUCH_DOLLY_PAN:
        if (this.dolly.enableZoom === false && this.pan.enablePan === false)
          return false;
        this.handleTouchMoveDollyPan(event, pointers);
        return true;

      case STATE.TOUCH_DOLLY_ROTATE:
        if (
          this.dolly.enableZoom === false &&
          this.rotate.enableRotate === false
        )
          return false;
        this.handleTouchMoveDollyRotate(event, pointers);
        return true;
    }
    return false;
  };

  handleTouchStartDollyPan = (pointers: PointerEvent[]) => {
    this.dolly.handleTouchStartDolly(pointers);
    this.pan.handleTouchStartPan(pointers);
  };

  handleTouchStartDollyRotate = (pointers: PointerEvent[]) => {
    this.dolly.handleTouchStartDolly(pointers);
    this.rotate.handleTouchStartRotate(pointers);
  };

  handleTouchMoveDollyPan = (event: PointerEvent, pointers: PointerEvent[]) => {
    this.dolly.handleTouchMoveDolly(event);
    this.pan.handleTouchMovePan(event, pointers);
  };

  handleTouchMoveDollyRotate = (
    event: PointerEvent,
    pointers: PointerEvent[]
  ) => {
    this.dolly.handleTouchMoveDolly(event);
    this.rotate.handleTouchMoveRotate(event, pointers);
  };
}
