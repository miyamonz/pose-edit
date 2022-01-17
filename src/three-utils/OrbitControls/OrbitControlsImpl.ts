import {
  Camera,
  EventDispatcher,
  Matrix4,
  MOUSE,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Spherical,
  TOUCH,
  Vector2,
  Vector3,
} from "three";

// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move

const moduloWrapAround = (offset: number, capacity: number) =>
  ((offset % capacity) + capacity) % capacity;

const changeEvent = { type: "change" };
const startEvent = { type: "start" };
const endEvent = { type: "end" };

const STATE = {
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

  // How far you can zoom in and out ( OrthographicCamera only )
  minZoom = 0;
  maxZoom = Infinity;

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
  enablePan = true;
  panSpeed = 1.0;
  screenSpacePanning = true; // if false, pan orthogonal to world-space direction camera.up
  keyPanSpeed = 7.0; // pixels moved per arrow key push
  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop
  autoRotate = false;
  autoRotateSpeed = 2.0; // 30 seconds per orbit when fps is 60
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
  private state: number = STATE.NONE;

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

  // rotate

  // Set to false to disable rotating
  enableRotate = true;
  rotateSpeed = 1.0;
  rotateStart = new Vector2();
  rotateEnd = new Vector2();
  rotateDelta = new Vector2();

  rotateLeft(angle: number): void {
    this.sphericalDelta.theta -= angle;
  }

  rotateUp(angle: number): void {
    this.sphericalDelta.phi -= angle;
  }

  // pan
  panOffset = new Vector3();

  panStart = new Vector2();
  panEnd = new Vector2();
  panDelta = new Vector2();

  panLeft = (() => {
    const v = new Vector3();
    return (distance: number, objectMatrix: Matrix4) => {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix
      v.multiplyScalar(-distance);

      this.panOffset.add(v);
    };
  })();

  panUp = (() => {
    const v = new Vector3();

    return (distance: number, objectMatrix: Matrix4) => {
      if (this.screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.crossVectors(this.object.up, v);
      }

      v.multiplyScalar(distance);

      this.panOffset.add(v);
    };
  })();

  // deltaX and deltaY are in pixels; right and down are positive
  pan = (() => {
    const offset = new Vector3();

    return (deltaX: number, deltaY: number) => {
      const element = this.domElement;

      if (
        element &&
        this.object instanceof PerspectiveCamera &&
        this.object.isPerspectiveCamera
      ) {
        // perspective
        const position = this.object.position;
        offset.copy(position).sub(this.target);
        let targetDistance = offset.length();

        // half of the fov is center to top of screen
        targetDistance *= Math.tan(((this.object.fov / 2) * Math.PI) / 180.0);

        // we use only clientHeight here so aspect ratio does not distort speed
        this.panLeft(
          (2 * deltaX * targetDistance) / element.clientHeight,
          this.object.matrix
        );
        this.panUp(
          (2 * deltaY * targetDistance) / element.clientHeight,
          this.object.matrix
        );
      } else if (
        element &&
        this.object instanceof OrthographicCamera &&
        this.object.isOrthographicCamera
      ) {
        // orthographic
        this.panLeft(
          (deltaX * (this.object.right - this.object.left)) /
            this.object.zoom /
            element.clientWidth,
          this.object.matrix
        );
        this.panUp(
          (deltaY * (this.object.top - this.object.bottom)) /
            this.object.zoom /
            element.clientHeight,
          this.object.matrix
        );
      } else {
        // camera neither orthographic nor perspective
        console.warn(
          "WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."
        );
        this.enablePan = false;
      }
    };
  })();

  // dolly
  zoomChanged = false;
  // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming
  enableZoom = true;
  zoomSpeed = 1.0;
  getZoomScale(): number {
    return Math.pow(0.95, this.zoomSpeed);
  }

  dollyStart = new Vector2();
  dollyEnd = new Vector2();
  dollyDelta = new Vector2();

  dollyOut(dollyScale: number) {
    if (
      this.object instanceof PerspectiveCamera &&
      this.object.isPerspectiveCamera
    ) {
      this.scale /= dollyScale;
    } else if (
      this.object instanceof OrthographicCamera &&
      this.object.isOrthographicCamera
    ) {
      this.object.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.object.zoom * dollyScale)
      );
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn(
        "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
      );
      this.enableZoom = false;
    }
  }

  dollyIn(dollyScale: number) {
    if (
      this.object instanceof PerspectiveCamera &&
      this.object.isPerspectiveCamera
    ) {
      this.scale *= dollyScale;
    } else if (
      this.object instanceof OrthographicCamera &&
      this.object.isOrthographicCamera
    ) {
      this.object.zoom = Math.max(
        this.minZoom,
        Math.min(this.maxZoom, this.object.zoom / dollyScale)
      );
      this.object.updateProjectionMatrix();
      this.zoomChanged = true;
    } else {
      console.warn(
        "WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."
      );
      this.enableZoom = false;
    }
  }

  //
  // event callbacks - update the object state
  //

  handleMouseDownRotate = (event: MouseEvent) => {
    this.rotateStart.set(event.clientX, event.clientY);
  };

  handleMouseDownDolly(event: MouseEvent) {
    this.dollyStart.set(event.clientX, event.clientY);
  }

  handleMouseDownPan = (event: MouseEvent) => {
    this.panStart.set(event.clientX, event.clientY);
  };

  handleMouseMoveRotate = (event: MouseEvent) => {
    this.rotateEnd.set(event.clientX, event.clientY);
    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);

    const element = this.domElement;

    if (element) {
      this.rotateLeft(
        (2 * Math.PI * this.rotateDelta.x) / element.clientHeight
      ); // yes, height
      this.rotateUp((2 * Math.PI * this.rotateDelta.y) / element.clientHeight);
    }
    this.rotateStart.copy(this.rotateEnd);
    this.update();
  };

  handleMouseMoveDolly = (event: MouseEvent) => {
    this.dollyEnd.set(event.clientX, event.clientY);
    this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);

    if (this.dollyDelta.y > 0) {
      this.dollyOut(this.getZoomScale());
    } else if (this.dollyDelta.y < 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.dollyStart.copy(this.dollyEnd);
    this.update();
  };

  handleMouseMovePan = (event: MouseEvent) => {
    this.panEnd.set(event.clientX, event.clientY);
    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
    this.update();
  };

  handleMouseWheel = (event: WheelEvent) => {
    if (event.deltaY < 0) {
      this.dollyIn(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyOut(this.getZoomScale());
    }

    this.update();
  };

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

  handleTouchStartRotate = () => {
    if (this.pointers.length == 1) {
      this.rotateStart.set(this.pointers[0].pageX, this.pointers[0].pageY);
    } else {
      const x = 0.5 * (this.pointers[0].pageX + this.pointers[1].pageX);
      const y = 0.5 * (this.pointers[0].pageY + this.pointers[1].pageY);

      this.rotateStart.set(x, y);
    }
  };

  handleTouchStartPan = () => {
    if (this.pointers.length == 1) {
      this.panStart.set(this.pointers[0].pageX, this.pointers[0].pageY);
    } else {
      const x = 0.5 * (this.pointers[0].pageX + this.pointers[1].pageX);
      const y = 0.5 * (this.pointers[0].pageY + this.pointers[1].pageY);

      this.panStart.set(x, y);
    }
  };

  handleTouchStartDolly = () => {
    const dx = this.pointers[0].pageX - this.pointers[1].pageX;
    const dy = this.pointers[0].pageY - this.pointers[1].pageY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyStart.set(0, distance);
  };

  handleTouchStartDollyPan = () => {
    if (this.enableZoom) this.handleTouchStartDolly();
    if (this.enablePan) this.handleTouchStartPan();
  };

  handleTouchStartDollyRotate = () => {
    if (this.enableZoom) this.handleTouchStartDolly();
    if (this.enableRotate) this.handleTouchStartRotate();
  };

  handleTouchMoveRotate = (event: PointerEvent) => {
    if (this.pointers.length == 1) {
      this.rotateEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.rotateEnd.set(x, y);
    }

    this.rotateDelta
      .subVectors(this.rotateEnd, this.rotateStart)
      .multiplyScalar(this.rotateSpeed);

    const element = this.domElement;

    if (element) {
      this.rotateLeft(
        (2 * Math.PI * this.rotateDelta.x) / element.clientHeight
      ); // yes, height
      this.rotateUp((2 * Math.PI * this.rotateDelta.y) / element.clientHeight);
    }
    this.rotateStart.copy(this.rotateEnd);
  };

  handleTouchMovePan = (event: PointerEvent) => {
    if (this.pointers.length == 1) {
      this.panEnd.set(event.pageX, event.pageY);
    } else {
      const position = this.getSecondPointerPosition(event);
      const x = 0.5 * (event.pageX + position.x);
      const y = 0.5 * (event.pageY + position.y);
      this.panEnd.set(x, y);
    }

    this.panDelta
      .subVectors(this.panEnd, this.panStart)
      .multiplyScalar(this.panSpeed);
    this.pan(this.panDelta.x, this.panDelta.y);
    this.panStart.copy(this.panEnd);
  };

  handleTouchMoveDolly = (event: PointerEvent) => {
    const position = this.getSecondPointerPosition(event);
    const dx = event.pageX - position.x;
    const dy = event.pageY - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    this.dollyEnd.set(0, distance);
    this.dollyDelta.set(
      0,
      Math.pow(this.dollyEnd.y / this.dollyStart.y, this.zoomSpeed)
    );
    this.dollyOut(this.dollyDelta.y);
    this.dollyStart.copy(this.dollyEnd);
  };

  handleTouchMoveDollyPan = (event: PointerEvent) => {
    if (this.enableZoom) this.handleTouchMoveDolly(event);
    if (this.enablePan) this.handleTouchMovePan(event);
  };

  handleTouchMoveDollyRotate = (event: PointerEvent) => {
    if (this.enableZoom) this.handleTouchMoveDolly(event);
    if (this.enableRotate) this.handleTouchMoveRotate(event);
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
      this.onMouseDown(event);
    }
  };

  onPointerMove = (event: PointerEvent) => {
    if (this.enabled === false) return;

    if (event.pointerType === "touch") {
      this.onTouchMove(event);
    } else {
      this.onMouseMove(event);
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

  onMouseDown = (event: MouseEvent) => {
    let mouseAction;

    switch (event.button) {
      case 0:
        mouseAction = this.mouseButtons.LEFT;
        break;

      case 1:
        mouseAction = this.mouseButtons.MIDDLE;
        break;

      case 2:
        mouseAction = this.mouseButtons.RIGHT;
        break;

      default:
        mouseAction = -1;
    }

    switch (mouseAction) {
      case MOUSE.DOLLY:
        if (this.enableZoom === false) return;
        this.handleMouseDownDolly(event);
        this.state = STATE.DOLLY;
        break;

      case MOUSE.ROTATE:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enablePan === false) return;
          this.handleMouseDownPan(event);
          this.state = STATE.PAN;
        } else {
          if (this.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          this.state = STATE.ROTATE;
        }
        break;

      case MOUSE.PAN:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (this.enableRotate === false) return;
          this.handleMouseDownRotate(event);
          this.state = STATE.ROTATE;
        } else {
          if (this.enablePan === false) return;
          this.handleMouseDownPan(event);
          this.state = STATE.PAN;
        }
        break;

      default:
        this.state = STATE.NONE;
    }

    if (this.state !== STATE.NONE) {
      this.dispatchEvent(startEvent);
    }
  };

  onMouseMove = (event: MouseEvent) => {
    if (this.enabled === false) return;

    switch (this.state) {
      case STATE.ROTATE:
        if (this.enableRotate === false) return;
        this.handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (this.enableZoom === false) return;
        this.handleMouseMoveDolly(event);
        break;

      case STATE.PAN:
        if (this.enablePan === false) return;
        this.handleMouseMovePan(event);
        break;
    }
  };

  onMouseWheel = (event: WheelEvent) => {
    const { state } = this;
    if (
      this.enabled === false ||
      this.enableZoom === false ||
      (state !== STATE.NONE && state !== STATE.ROTATE)
    ) {
      return;
    }

    event.preventDefault();

    this.dispatchEvent(startEvent);
    this.handleMouseWheel(event);
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
            if (this.enableRotate === false) return;
            this.handleTouchStartRotate();
            this.state = STATE.TOUCH_ROTATE;
            break;

          case TOUCH.PAN:
            if (this.enablePan === false) return;
            this.handleTouchStartPan();
            this.state = STATE.TOUCH_PAN;
            break;

          default:
            this.state = STATE.NONE;
        }

        break;

      case 2:
        switch (this.touches.TWO) {
          case TOUCH.DOLLY_PAN:
            if (this.enableZoom === false && this.enablePan === false) return;
            this.handleTouchStartDollyPan();
            this.state = STATE.TOUCH_DOLLY_PAN;
            break;

          case TOUCH.DOLLY_ROTATE:
            if (this.enableZoom === false && this.enableRotate === false)
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
        if (this.enableRotate === false) return;
        this.handleTouchMoveRotate(event);
        this.update();
        break;

      case STATE.TOUCH_PAN:
        if (this.enablePan === false) return;
        this.handleTouchMovePan(event);
        this.update();
        break;

      case STATE.TOUCH_DOLLY_PAN:
        if (this.enableZoom === false && this.enablePan === false) return;
        this.handleTouchMoveDollyPan(event);
        this.update();
        break;

      case STATE.TOUCH_DOLLY_ROTATE:
        if (this.enableZoom === false && this.enableRotate === false) return;
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

  getAutoRotationAngle(): number {
    return ((2 * Math.PI) / 60 / 60) * this.autoRotateSpeed;
  }

  update: () => void;
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

        if (this.autoRotate && this.state === STATE.NONE) {
          this.rotateLeft(this.getAutoRotationAngle());
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
          this.target.addScaledVector(this.panOffset, this.dampingFactor);
        } else {
          this.target.add(this.panOffset);
        }

        offset.setFromSpherical(spherical);

        // rotate offset back to "camera-up-vector-is-up" space
        offset.applyQuaternion(quatInverse);

        position.copy(this.target).add(offset);

        this.object.lookAt(this.target);

        if (this.enableDamping === true) {
          sphericalDelta.theta *= 1 - this.dampingFactor;
          sphericalDelta.phi *= 1 - this.dampingFactor;

          this.panOffset.multiplyScalar(1 - this.dampingFactor);
        } else {
          sphericalDelta.set(0, 0, 0);

          this.panOffset.set(0, 0, 0);
        }

        this.scale = 1;

        // update condition is:
        // min(camera displacement, camera rotation in radians)^2 > EPS
        // using small-angle approximation cos(x/2) = 1 - x^2 / 8

        if (
          this.zoomChanged ||
          lastPosition.distanceToSquared(this.object.position) > EPS ||
          8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS
        ) {
          this.dispatchEvent(changeEvent);

          lastPosition.copy(this.object.position);
          lastQuaternion.copy(this.object.quaternion);
          this.zoomChanged = false;

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
    // force an update at start
    this.update();
  }
}

export { OrbitControls };
