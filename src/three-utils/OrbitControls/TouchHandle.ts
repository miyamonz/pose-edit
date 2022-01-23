import { TOUCH, Vector2 } from "three";
import { Dolly } from "./Dolly";
import { STATE } from "./OrbitControlsImpl";
import { Pan } from "./Pan";
import { Rotate } from "./Rotate";

const pointerToVector = (pointer: PointerEvent) => ({
  x: pointer.pageX,
  y: pointer.pageY,
});

type Control = { dolly: Dolly; rotate: Rotate; pan: Pan };
export class TouchHandle {
  control: Control;

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

  constructor(control: Control) {
    this.control = control;
  }

  onTouchStart = (pointers: Vector2[]): number | undefined => {
    switch (pointers.length) {
      case 1:
        const pos = [pointers[0].x, pointers[0].y] as const;
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.rotate.enableRotate === false) return;
            this.rotate.setStart(...pos);
            return STATE.TOUCH_ROTATE;

          case TOUCH.PAN:
            if (this.pan.enablePan === false) return;
            this.pan.setStart(...pos);
            return STATE.TOUCH_PAN;

          default:
            return STATE.NONE;
        }

      case 2:
        const p0 = pointers[0];
        const p1 = pointers[1];

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
            this.dolly.startDollyBy2Points(p0, p1);

            const x = 0.5 * (p0.x + p1.x);
            const y = 0.5 * (p0.y + p1.y);
            this.rotate.setStart(x, y);

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
    pointers: Vector2[],
    state: number
  ): boolean => {
    switch (state) {
      case STATE.TOUCH_ROTATE:
        // ここはpointerが1つ
        if (this.rotate.enableRotate === false) return false;
        this.rotate.handleMove(event.pageX, event.pageY);
        return true;

      case STATE.TOUCH_PAN:
        // pointer lengthが1
        if (this.pan.enablePan === false) return false;
        this.pan.handleMove(event.pageX, event.pageY);
        return true;

      case STATE.TOUCH_DOLLY_PAN:
        // pointer lengthが2
        if (this.dolly.enableZoom === false && this.pan.enablePan === false)
          return false;
        this.handleTouchMoveDollyPan(event, pointers);
        return true;

      case STATE.TOUCH_DOLLY_ROTATE:
        // onTouchStartでpointerが2のときにここにくるので、以降のgetSecondPointerは問題なく動く
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

  handleTouchStartDollyPan = (pointers: Vector2[]) => {
    const p0 = pointers[0];
    const p1 = pointers[1];
    this.dolly.startDollyBy2Points(p0, p1);

    const x = 0.5 * (p0.x + p1.x);
    const y = 0.5 * (p0.y + p1.y);
    this.pan.setStart(x, y);
  };

  handleTouchMoveDollyPan = (event: PointerEvent, pointers: Vector2[]) => {
    // const p0 = pointerToVector(event);
    // const pointer = getSecondPointer(event, pointers);
    // const p1 = pointerToVector(pointer);
    const p0 = pointers[0];
    const p1 = pointers[1];
    this.dolly.moveDollyBy2Points(p0, p1);

    const x = 0.5 * (p0.x + p1.x);
    const y = 0.5 * (p0.y + p1.y);
    this.pan.handleMove(x, y);
  };

  handleTouchMoveDollyRotate = (event: PointerEvent, pointers: Vector2[]) => {
    // const p0 = pointerToVector(event);
    // const pointer = getSecondPointer(event, pointers);
    // const p1 = pointerToVector(pointer);
    const p0 = pointers[0];
    const p1 = pointers[1];
    this.dolly.moveDollyBy2Points(p0, p1);

    const x = 0.5 * (p0.x + p1.x);
    const y = 0.5 * (p0.y + p1.y);
    this.rotate.handleMove(x, y);
  };
}
