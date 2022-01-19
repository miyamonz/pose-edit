import {
  Camera,
  EventDispatcher,
  MOUSE,
  PerspectiveCamera,
  Quaternion,
  Spherical,
  TOUCH,
  Vector2,
  Vector3,
} from "three";
import { Dolly } from "./Dolly";
import { Rotate } from "./Rotate";
import { MouseHandle } from "./MouseHandle";
import { Pan } from "./Pan";

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

const moduloWrapAround = (offset: number, capacity: number) =>
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

const EPS = 0.000001;

class OrbitControls extends EventDispatcher {
  object: Camera;
  domElement: HTMLElement | undefined;
  // Set to false to disable this control
  enabled = true;
  // "target" sets the location of focus, where the object orbits around
  target = new Vector3();
  // How far you can dolly in and out ( PerspectiveCamera only )
  minDistance = 0;
  maxDistance = Infinity;

  // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.
  minPolarAngle = 0; // radians
  maxPolarAngle = Math.PI; // radians

  // How far you can orbit horizontally, upper and lower limits.
  // If set, the interval [ min, max ] must be a sub-interval of [ - 2 PI, 2 PI ], with ( max - min < 2 PI )
  minAzimuthAngle = -Infinity; // radians
  maxAzimuthAngle = Infinity; // radians
  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop
  enableDamping = false;
  dampingFactor = 0.05;

  // Set to false to disable panning
  // Set to true to automatically rotate around the target
  // The four arrow keys
  keys = {
    LEFT: "ArrowLeft",
    UP: "ArrowUp",
    RIGHT: "ArrowRight",
    BOTTOM: "ArrowDown",
  };
  // Mouse buttons
  mouseButtons = {
    LEFT: MOUSE.ROTATE,
    MIDDLE: MOUSE.DOLLY,
    RIGHT: MOUSE.PAN,
  };
  // Touch fingers
  touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
  target0 = this.target.clone();

  position0: Vector3;
  zoom0: number;
  // the target DOM element for key events
  _domElementKeyEvents: any = null;

  spherical = new Spherical();
  sphericalDelta = new Spherical();

  scale = 1;

  public getPolarAngle() {
    return this.spherical.phi;
  }
  public getAzimuthalAngle() {
    return this.spherical.theta;
  }

  public setPolarAngle(value: number) {
    // use modulo wrapping to safeguard value
    let phi = moduloWrapAround(value, 2 * Math.PI);
    let currentPhi = this.spherical.phi;

    // convert to the equivalent shortest angle
    if (currentPhi < 0) currentPhi += 2 * Math.PI;
    if (phi < 0) phi += 2 * Math.PI;
    let phiDist = Math.abs(phi - currentPhi);
    if (2 * Math.PI - phiDist < phiDist) {
      if (phi < currentPhi) {
        phi += 2 * Math.PI;
      } else {
        currentPhi += 2 * Math.PI;
      }
    }
    this.sphericalDelta.phi = phi - currentPhi;
    this.update();
  }

  public setAzimuthalAngle(value: number) {
    // use modulo wrapping to safeguard value
    let theta = moduloWrapAround(value, 2 * Math.PI);
    let currentTheta = this.spherical.theta;

    // convert to the equivalent shortest angle
    if (currentTheta < 0) currentTheta += 2 * Math.PI;
    if (theta < 0) theta += 2 * Math.PI;
    let thetaDist = Math.abs(theta - currentTheta);
    if (2 * Math.PI - thetaDist < thetaDist) {
      if (theta < currentTheta) {
        theta += 2 * Math.PI;
      } else {
        currentTheta += 2 * Math.PI;
      }
    }
    this.sphericalDelta.theta = theta - currentTheta;
    this.update();
  }

  public getDistance() {
    return this.object.position.distanceTo(this.target);
  }

  public listenToKeyEvents(domElement: HTMLElement) {
    domElement.addEventListener("keydown", this.onKeyDown);
    this._domElementKeyEvents = domElement;
  }

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

  handleKeyDown = (event: KeyboardEvent) => {
    let needsUpdate = false;

    switch (event.code) {
      case this.keys.UP:
        this.pan(0, this.keyPanSpeed);
        needsUpdate = true;
        break;

      case this.keys.BOTTOM:
        this.pan(0, -this.keyPanSpeed);
        needsUpdate = true;
        break;

      case this.keys.LEFT:
        this.pan(this.keyPanSpeed, 0);
        needsUpdate = true;
        break;

      case this.keys.RIGHT:
        this.pan(-this.keyPanSpeed, 0);
        needsUpdate = true;
        break;
    }

    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();
      this.update();
    }
  };

  pointers: PointerEvent[] = [];

  handleTouchStartDollyPan = () => {
    this.dolly.handleTouchStartDolly(this.pointers);
    this.pan.handleTouchStartPan(this.pointers);
  };

  handleTouchStartDollyRotate = () => {
    this.dolly.handleTouchStartDolly(this.pointers);
    this.rotate.handleTouchStartRotate(this.pointers);
  };

  handleTouchMoveDollyPan = (event: PointerEvent) => {
    this.dolly.handleTouchMoveDolly(event);
    this.pan.handleTouchMovePan(event, this.pointers);
  };

  handleTouchMoveDollyRotate = (event: PointerEvent) => {
    this.dolly.handleTouchMoveDolly(event);
    this.rotate.handleTouchMoveRotate(event, this.pointers);
  };

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
      this.onTouchStart(event);
    } else {
      this.mouseHandle.onMouseDown(event);
    }
  };

  onPointerMove = (event: PointerEvent) => {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") {
      this.onTouchMove(event);
    } else {
      this.mouseHandle.onMouseMove(event);
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
    this.dispatchEvent(endEvent);
  };

  onKeyDown = (event: KeyboardEvent) => {
    if (this.enabled === false || this.enablePan === false) return;
    this.handleKeyDown(event);
  };
  onTouchStart = (event: PointerEvent) => {
    this.trackPointer(event);

    switch (this.pointers.length) {
      case 1:
        switch (this.touches.ONE) {
          case TOUCH.ROTATE:
            if (this.rotate.enableRotate === false) return;
            this.rotate.handleTouchStartRotate(this.pointers);
            this.state = STATE.TOUCH_ROTATE;
            break;

          case TOUCH.PAN:
            if (this.pan.enablePan === false) return;
            this.pan.handleTouchStartPan(this.pointers);
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

  onTouchMove = (event: PointerEvent) => {
    this.trackPointer(event);

    switch (this.state) {
      case STATE.TOUCH_ROTATE:
        if (this.rotate.enableRotate === false) return;
        this.rotate.handleTouchMoveRotate(event, this.pointers);
        this.update();
        break;

      case STATE.TOUCH_PAN:
        if (this.pan.enablePan === false) return;
        this.pan.handleTouchMovePan(event, this.pointers);
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

  update: () => void;
  mouseHandle: MouseHandle;
  dolly: Dolly;
  rotate: Rotate;
  pan: Pan;
  constructor(object: Camera, domElement?: HTMLElement) {
    super();

    this.object = object;
    this.domElement = domElement;

    // this method is exposed, but perhaps it would be better if we can make it private...
    this.update = (() => {
      const offset = new Vector3();

      // so camera.up is the orbit axis
      const quat = new Quaternion().setFromUnitVectors(
        this.object.up,
        new Vector3(0, 1, 0)
      );
      const quatInverse = quat.clone().invert();

      const lastPosition = new Vector3();
      const lastQuaternion = new Quaternion();

      const twoPI = 2 * Math.PI;

      return (): boolean => {
        const { spherical, sphericalDelta, scale } = this;
        const position = this.object.position;

        offset.copy(position).sub(this.target);

        // rotate offset to "y-axis-is-up" space
        offset.applyQuaternion(quat);

        // angle from z-axis around y-axis
        spherical.setFromVector3(offset);

        if (this.state === STATE.NONE) {
          this.rotate.updateAutoRotate();
        }

        if (this.enableDamping) {
          spherical.theta += sphericalDelta.theta * this.dampingFactor;
          spherical.phi += sphericalDelta.phi * this.dampingFactor;
        } else {
          spherical.theta += sphericalDelta.theta;
          spherical.phi += sphericalDelta.phi;
        }

        // restrict theta to be between desired limits

        let min = this.minAzimuthAngle;
        let max = this.maxAzimuthAngle;

        if (isFinite(min) && isFinite(max)) {
          if (min < -Math.PI) min += twoPI;
          else if (min > Math.PI) min -= twoPI;

          if (max < -Math.PI) max += twoPI;
          else if (max > Math.PI) max -= twoPI;

          if (min <= max) {
            spherical.theta = Math.max(min, Math.min(max, spherical.theta));
          } else {
            spherical.theta =
              spherical.theta > (min + max) / 2
                ? Math.max(min, spherical.theta)
                : Math.min(max, spherical.theta);
          }
        }

        // restrict phi to be between desired limits
        spherical.phi = Math.max(
          this.minPolarAngle,
          Math.min(this.maxPolarAngle, spherical.phi)
        );
        spherical.makeSafe();
        spherical.radius *= scale;

        // restrict radius to be between desired limits
        spherical.radius = Math.max(
          this.minDistance,
          Math.min(this.maxDistance, spherical.radius)
        );

        // move target to panned location

        if (this.enableDamping === true) {
          this.target.addScaledVector(this.pan.panOffset, this.dampingFactor);
        } else {
          this.target.add(this.pan.panOffset);
        }

        offset.setFromSpherical(spherical);

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse);

        position.copy(this.target).add(offset);

        this.object.lookAt(this.target);

        if (this.enableDamping === true) {
          sphericalDelta.theta *= 1 - this.dampingFactor;
          sphericalDelta.phi *= 1 - this.dampingFactor;

          this.pan.panOffset.multiplyScalar(1 - this.dampingFactor);
        } else {
          sphericalDelta.set(0, 0, 0);

          this.pan.panOffset.set(0, 0, 0);
        }

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (
          this.dolly.zoomChanged ||
          lastPosition.distanceToSquared(this.object.position) > EPS ||
          8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS
        ) {
          this.dispatchEvent(changeEvent);

          lastPosition.copy(this.object.position);
          lastQuaternion.copy(this.object.quaternion);
          this.dolly.zoomChanged = false;

          return true;
        }

        return false;
      };
    })();
    // for reset
    this.position0 = this.object.position.clone();
    this.zoom0 =
      this.object instanceof PerspectiveCamera ? this.object.zoom : 1;

    // connect events
    if (domElement !== undefined) this.connect(domElement);

    this.mouseHandle = new MouseHandle(this);
    this.dolly = new Dolly(this);
    this.rotate = new Rotate(this);
    this.pan = new Pan(this);
    // force an update at start
    this.update();
  }
}

export { OrbitControls };
