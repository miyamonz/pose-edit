import {
  Camera,
  EventDispatcher,
  PerspectiveCamera,
  Vector2,
  Vector3,
} from "three";
import { Dolly } from "./Dolly";
import { Rotate } from "./Rotate";
import { MouseHandle } from "./MouseHandle";
import { Pan } from "./Pan";
import { TouchHandle } from "./TouchHandle";
import { KeyboardHandle } from "./KeyboardHandle";
import { SphericalState } from "./SphericalState";
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
export const startEvent = { type: "start" };
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
  // save and reset
  target0 = this.target.clone();
  position0: Vector3;
  zoom0: number;

  public saveState() {
    this.target0.copy(this.target);
    this.position0.copy(this.object.position);
    this.zoom0 =
      this.object instanceof PerspectiveCamera ? this.object.zoom : 1;
  }
  public state: number = STATE.NONE;

  public reset() {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    if (this.object instanceof PerspectiveCamera) {
      this.object.zoom = this.zoom0;
      this.object.updateProjectionMatrix();
    }

    this.dispatchEvent(changeEvent);

    this.update();

    this.state = STATE.NONE;
  }

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

  pointers: PointerEvent[] = [];

  //
  // event handlers - FSM: listen for events and reset state
  //

  onPointerDown = (event: PointerEvent) => {
    if (this.enabled === false) return;

    if (this.pointers.length === 0) {
      this.domElement?.ownerDocument.addEventListener(
        "pointermove",
        this.onPointerMove
      );
      this.domElement?.ownerDocument.addEventListener(
        "pointerup",
        this.onPointerUp
      );
    }

    this.addPointer(event);

    if (event.pointerType === "touch") {
      this.trackPointer(event);
      const newState = this.touchHandle.onTouchStart(this.pointers);
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
      this.trackPointer(event);
      const needsUpdate = this.touchHandle.onTouchMove(
        event,
        this.pointers,
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
    this.removePointer(event);

    if (this.pointers.length === 0) {
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
    this.removePointer(event);
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

  addPointer = (event: PointerEvent) => {
    this.pointers.push(event);
  };

  pointerPositions: { [key: string]: Vector2 } = {};

  removePointer(event: PointerEvent) {
    delete this.pointerPositions[event.pointerId];

    for (let i = 0; i < this.pointers.length; i++) {
      if (this.pointers[i].pointerId == event.pointerId) {
        this.pointers.splice(i, 1);
        return;
      }
    }
  }

  trackPointer(event: PointerEvent) {
    let position = this.pointerPositions[event.pointerId];

    if (position === undefined) {
      position = new Vector2();
      this.pointerPositions[event.pointerId] = position;
    }

    position.set(event.pageX, event.pageY);
  }

  getSecondPointerPosition(event: PointerEvent) {
    const pointer =
      event.pointerId === this.pointers[0].pointerId
        ? this.pointers[1]
        : this.pointers[0];
    return this.pointerPositions[pointer.pointerId];
  }

  // update
  tmp: Vector3 = new Vector3();

  // this method is exposed, but perhaps it would be better if we can make it private...
  update = () => {
    const offset = this.tmp.copy(this.object.position).sub(this.target);
    this.sphericalState.allignSpherical(offset);

    if (this.state === STATE.NONE) {
      this.rotate.updateAutoRotate();
    }

    this.sphericalState.applyDelta();

    this.sphericalState.restrict();
    // move target to panned location
    this.pan.update();

    this.sphericalState.updateObjectTransform(this.object, this.target);

    const changed = this.dolly.checkZoomed(this.object);
    if (changed) {
      this.dispatchEvent(changeEvent);
    }
  };

  mouseHandle: MouseHandle;
  touchHandle: TouchHandle;
  keyboardHandle: KeyboardHandle;
  sphericalState: SphericalState;
  dolly: Dolly;
  rotate: Rotate;
  pan: Pan;

  constructor(object: Camera, domElement?: HTMLElement) {
    super();

    this.object = object;
    this.domElement = domElement;

    // ES2022 Class Static Block使いたい
    // いや、constructorで渡されるものを使ってるのは無理か

    // for reset
    this.position0 = this.object.position.clone();
    this.zoom0 =
      this.object instanceof PerspectiveCamera ? this.object.zoom : 1;

    // connect events
    if (domElement !== undefined) this.connect(domElement);

    this.dolly = new Dolly(this);
    this.rotate = new Rotate(this);
    this.pan = new Pan(this);

    this.sphericalState = new SphericalState(this);

    this.mouseHandle = new MouseHandle(this);
    this.touchHandle = new TouchHandle(this);
    this.keyboardHandle = new KeyboardHandle(this.pan);

    // force an update at start
    this.update();
  }
}

export { OrbitControls };
