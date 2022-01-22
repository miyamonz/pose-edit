import { Camera, EventDispatcher, Vector3 } from "three";
import { Dolly } from "./Dolly";
import { Rotate } from "./Rotate";
import { MouseHandle } from "./MouseHandle";
import { Pan } from "./Pan";
import { TouchHandle } from "./TouchHandle";
import { KeyboardHandle } from "./KeyboardHandle";
import { SphericalState } from "./SphericalState";
import { SaveState } from "./SaveState";
import { PointerState } from "./PointerState";
export const twoPI = 2 * Math.PI;

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

export const moduloWrapAround = (offset: number, capacity: number) =>
  ((offset % capacity) + capacity) % capacity;

const changeEvent = { type: "change" };
const startEvent = { type: "start" };
const endEvent = { type: "end" };

export const STATE = {
  NONE: -1,
  ROTATE: 0,
  DOLLY: 1,
  PAN: 2,
  TOUCH_ROTATE: 3,
  TOUCH_PAN: 4,
  TOUCH_DOLLY_PAN: 5,
  TOUCH_DOLLY_ROTATE: 6,
};

class OrbitControls extends EventDispatcher {
  object: Camera;
  domElement: HTMLElement | undefined;
  // Set to false to disable this control
  enabled = true;
  // "target" sets the location of focus, where the object orbits around
  target = new Vector3();
  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop

  // the target DOM element for key events
  _domElementKeyEvents: any = null;

  // public methods

  public getDistance() {
    return this.object.position.distanceTo(this.target);
  }

  public listenToKeyEvents(domElement: HTMLElement) {
    domElement.addEventListener("keydown", this.onKeyDown);
    this._domElementKeyEvents = domElement;
  }

  public state: number = STATE.NONE;

  // https://github.com/mrdoob/three.js/issues/20575
  connect = (domElement: HTMLElement): void => {
    if ((domElement as any) === document) {
      console.error(
        'THREE.OrbitControls: "document" should not be used as the target "domElement". Please use "renderer.domElement" instead.'
      );
    }
    this.domElement = domElement;
    // disables touch scroll
    // touch-action needs to be defined for pointer events to work on mobile
    // https://stackoverflow.com/a/48254578
    this.domElement.style.touchAction = "none";
    this.domElement.addEventListener("contextmenu", this.onContextMenu);
    this.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.domElement.addEventListener("pointercancel", this.onPointerCancel);
    this.domElement.addEventListener("wheel", this.onMouseWheel);
  };

  dispose = (): void => {
    this.domElement?.removeEventListener("contextmenu", this.onContextMenu);
    this.domElement?.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement?.removeEventListener("pointercancel", this.onPointerCancel);
    this.domElement?.removeEventListener("wheel", this.onMouseWheel);
    this.domElement?.ownerDocument.removeEventListener(
      "pointermove",
      this.onPointerMove
    );
    this.domElement?.ownerDocument.removeEventListener(
      "pointerup",
      this.onPointerUp
    );
    if (this._domElementKeyEvents !== null) {
      this._domElementKeyEvents.removeEventListener("keydown", this.onKeyDown);
    }
    //this.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  };

  //internal

  pointerState = new PointerState();
  //
  // event handlers - FSM: listen for events and reset state
  //

  onPointerDown = (event: PointerEvent) => {
    if (this.enabled === false) return;

    if (this.pointerState.pointers.length === 0) {
      this.domElement?.ownerDocument.addEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.domElement?.ownerDocument.addEventListener(
        "pointerup",
        this.onPointerUp
      );
    }

    this.pointerState.addPointer(event);

    if (event.pointerType === "touch") {
      this.pointerState.trackPointer(event);
      const newState = this.touchHandle.onTouchStart(
        this.pointerState.pointers
      );
      if (newState !== undefined) {
        this.state = newState;
      }
    } else {
      const newState = this.mouseHandle.onMouseDown(event);
      if (newState !== undefined) {
        this.state = newState;
      }
    }
    if (this.state !== STATE.NONE) {
      this.dispatchEvent(startEvent);
    }
  };

  onPointerMove = (event: PointerEvent) => {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") {
      this.pointerState.trackPointer(event);
      const needsUpdate = this.touchHandle.onTouchMove(
        event,
        this.pointerState.pointers,
        this.state
      );
      if (
        ![
          STATE.TOUCH_ROTATE,
          STATE.TOUCH_DOLLY_PAN,
          STATE.TOUCH_DOLLY_ROTATE,
        ].includes(this.state)
      ) {
        this.state = STATE.NONE;
      }
      if (needsUpdate) {
        this.update();
      }
    } else {
      const needsUpdate = this.mouseHandle.onMouseMove(event, this.state);
      if (needsUpdate) {
        this.update();
      }
    }
  };

  onPointerUp = (event: PointerEvent) => {
    this.pointerState.removePointer(event);

    if (this.pointerState.pointers.length === 0) {
      this.domElement?.releasePointerCapture(event.pointerId);

      this.domElement?.ownerDocument.removeEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.domElement?.ownerDocument.removeEventListener(
        "pointerup",
        this.onPointerUp
      );
    }

    this.dispatchEvent(endEvent);

    this.state = STATE.NONE;
  };

  onPointerCancel = (event: PointerEvent) => {
    this.pointerState.removePointer(event);
  };

  onMouseWheel = (event: WheelEvent) => {
    const { state } = this;
    if (
      this.enabled === false ||
      this.dolly.enableZoom === false ||
      (state !== STATE.NONE && state !== STATE.ROTATE)
    ) {
      return;
    }

    event.preventDefault();

    this.dispatchEvent(startEvent);
    this.dolly.handleMouseWheel(event);
    this.update();
    this.dispatchEvent(endEvent);
  };

  onKeyDown = (event: KeyboardEvent) => {
    if (this.enabled === false) return;
    const needsUpdate = this.keyboardHandle.handleKeyDown(event);
    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();
      this.update();
    }
  };

  onContextMenu = (event: Event) => {
    if (this.enabled === false) return;
    event.preventDefault();
  };

  saveState: SaveState;
  reset() {
    this.saveState.reset();
    this.dispatchEvent(changeEvent);
    this.update();
    this.state = STATE.NONE;
  }

  tmp: Vector3 = new Vector3();
  // this method is exposed, but perhaps it would be better if we can make it private...
  update = () => {
    const offset = this.tmp.copy(this.object.position).sub(this.target);

    // move target to panned location
    this.pan.update(this.target);

    // rotate
    if (this.state === STATE.NONE) {
      this.rotate.updateAutoRotate();
    }

    this.rotate.update(offset, this.object, this.target);

    // dollyはOrbitControlsにおいては、cameraのzoomを変更することを意味する
    // なので、特にupdate()を呼び出す必要はない
    // ただし、他と同様にdampingなどの実装をすれば当然update()を呼び出す必要があるだろう

    const changed = this.dolly.checkZoomed(this.object);
    if (changed) {
      this.dispatchEvent(changeEvent);
    }
  };

  mouseHandle: MouseHandle;
  touchHandle: TouchHandle;
  keyboardHandle: KeyboardHandle;
  dolly: Dolly;
  rotate: Rotate;
  pan: Pan;

  constructor(object: Camera, domElement?: HTMLElement) {
    super();

    this.object = object;
    this.domElement = domElement;

    // for reset
    this.saveState = new SaveState(object, this.target);

    // connect events
    if (domElement !== undefined) this.connect(domElement);

    const dolly = new Dolly(object);

    const sphericalState = new SphericalState(dolly, object);
    const mapper = (x: number, y: number) => {
      const height = this.domElement?.clientHeight ?? 1;
      const leftAngle = height ? (2 * Math.PI * x) / height : 0;
      const upAngle = height ? (2 * Math.PI * y) / height : 0;
      return [leftAngle, upAngle] as const;
    };
    const rotate = new Rotate(sphericalState, mapper);

    const pan = new Pan({
      object,
      target: this.target,
      domElement: () => this.domElement,
    });

    const control = { dolly, rotate, pan };
    this.mouseHandle = new MouseHandle(control);
    this.touchHandle = new TouchHandle(control);
    this.keyboardHandle = new KeyboardHandle(pan);

    this.dolly = dolly;
    this.rotate = rotate;
    this.pan = pan;

    // force an update at start
    this.update();
  }
}

export { OrbitControls };
