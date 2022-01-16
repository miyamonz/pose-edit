import {
  BufferGeometry,
  Material,
  Mesh,
  Object3D,
  Quaternion,
  Raycaster,
  Intersection,
  Vector3,
  Camera,
} from "three";
import { TransformControlsGizmo } from "./TransformControlsGizmo";
import { TransformControlsPlane } from "./TransformControlsPlane";

export interface TransformControlsPointerObject {
  x: number;
  y: number;
  button: number;
}

function intersectObjectWithRay(
  object: Object3D,
  raycaster: Raycaster,
  includeInvisible?: boolean
): false | Intersection {
  const allIntersections = raycaster.intersectObject(object, true);

  for (let i = 0; i < allIntersections.length; i++) {
    if (allIntersections[i].object.visible || includeInvisible) {
      return allIntersections[i];
    }
  }

  return false;
}

class TransformControls<TCamera extends Camera = Camera> extends Object3D {
  public readonly isTransformControls = true;

  public visible = false;

  private domElement: HTMLElement | Document;

  private raycaster = new Raycaster();

  private gizmo: TransformControlsGizmo;
  private plane: TransformControlsPlane;

  private tempVector = new Vector3();
  private tempVector2 = new Vector3();
  private tempQuaternion = new Quaternion();
  private unit = {
    X: new Vector3(1, 0, 0),
    Y: new Vector3(0, 1, 0),
    Z: new Vector3(0, 0, 1),
  };

  private pointStart = new Vector3();
  private pointEnd = new Vector3();
  private offset = new Vector3();
  private rotationAxis = new Vector3();
  private startNorm = new Vector3();
  private endNorm = new Vector3();
  private rotationAngle = 0;

  private cameraPosition = new Vector3();
  private cameraQuaternion = new Quaternion();
  private cameraScale = new Vector3();

  private parentPosition = new Vector3();
  private parentQuaternion = new Quaternion();
  private parentQuaternionInv = new Quaternion();
  private parentScale = new Vector3();

  private worldPositionStart = new Vector3();
  private worldQuaternionStart = new Quaternion();
  private worldScaleStart = new Vector3();

  private worldPosition = new Vector3();
  private worldQuaternion = new Quaternion();
  private worldQuaternionInv = new Quaternion();
  private worldScale = new Vector3();

  private eye = new Vector3();

  private positionStart = new Vector3();
  private quaternionStart = new Quaternion();
  private scaleStart = new Vector3();

  private camera: TCamera;
  private object: Object3D | undefined;
  private enabled = true;
  private axis: string | null = null;
  public mode: "translate" | "rotate" | "scale" = "translate";
  public translationSnap: number | null = null;
  public rotationSnap: number | null = null;
  public scaleSnap: number | null = null;
  public space = "world";
  public size = 1;
  private dragging = false;
  private showX = true;
  private showY = true;
  private showZ = true;

  // events
  private changeEvent = { type: "change" };
  private mouseDownEvent = { type: "mouseDown", mode: this.mode };
  private mouseUpEvent = { type: "mouseUp", mode: this.mode };
  private objectChangeEvent = { type: "objectChange" };

  constructor(camera: TCamera, domElement: HTMLElement) {
    super();

    this.domElement = domElement;
    this.camera = camera;

    this.gizmo = new TransformControlsGizmo();
    this.add(this.gizmo);

    this.plane = new TransformControlsPlane();
    this.add(this.plane);

    // Defined getter, setter and store for a property
    const defineProperty = <TValue>(
      propName: string,
      defaultValue: TValue
    ): void => {
      let propValue = defaultValue;

      Object.defineProperty(this, propName, {
        get: function () {
          return propValue !== undefined ? propValue : defaultValue;
        },

        set: function (value) {
          if (propValue !== value) {
            propValue = value;
            this.plane[propName] = value;
            this.gizmo[propName] = value;

            this.dispatchEvent({ type: propName + "-changed", value: value });
            this.dispatchEvent(this.changeEvent);
          }
        },
      });

      //@ts-ignore
      this[propName] = defaultValue;
      // @ts-ignore
      this.plane[propName] = defaultValue;
      // @ts-ignore
      this.gizmo[propName] = defaultValue;
    };

    defineProperty("camera", this.camera);
    defineProperty("object", this.object);
    defineProperty("enabled", this.enabled);
    defineProperty("axis", this.axis);
    defineProperty("mode", this.mode);
    defineProperty("translationSnap", this.translationSnap);
    defineProperty("rotationSnap", this.rotationSnap);
    defineProperty("scaleSnap", this.scaleSnap);
    defineProperty("space", this.space);
    defineProperty("size", this.size);
    defineProperty("dragging", this.dragging);
    defineProperty("showX", this.showX);
    defineProperty("showY", this.showY);
    defineProperty("showZ", this.showZ);
    defineProperty("worldPosition", this.worldPosition);
    defineProperty("worldPositionStart", this.worldPositionStart);
    defineProperty("worldQuaternion", this.worldQuaternion);
    defineProperty("worldQuaternionStart", this.worldQuaternionStart);
    defineProperty("cameraPosition", this.cameraPosition);
    defineProperty("cameraQuaternion", this.cameraQuaternion);
    defineProperty("pointStart", this.pointStart);
    defineProperty("pointEnd", this.pointEnd);
    defineProperty("rotationAxis", this.rotationAxis);
    defineProperty("rotationAngle", this.rotationAngle);
    defineProperty("eye", this.eye);

    {
      domElement.addEventListener("pointerdown", this.onPointerDown);
      domElement.addEventListener("pointermove", this.onPointerHover);
      this.domElement.ownerDocument.addEventListener(
        "pointerup",
        this.onPointerUp
      );
    }
  }

  // Set current object
  public attach = (object: Object3D): this => {
    this.object = object;
    this.visible = true;

    return this;
  };

  // Detatch from object
  public detach = (): this => {
    this.object = undefined;
    this.visible = false;
    this.axis = null;

    return this;
  };

  public updateMatrixWorld = (): void => {
    if (this.object !== undefined) {
      this.object.updateMatrixWorld();

      if (this.object.parent === null) {
        console.error(
          "TransformControls: The attached 3D object must be a part of the scene graph."
        );
      } else {
        this.object.parent.matrixWorld.decompose(
          this.parentPosition,
          this.parentQuaternion,
          this.parentScale
        );
      }

      this.object.matrixWorld.decompose(
        this.worldPosition,
        this.worldQuaternion,
        this.worldScale
      );

      this.parentQuaternionInv.copy(this.parentQuaternion).invert();
      this.worldQuaternionInv.copy(this.worldQuaternion).invert();
    }

    this.camera.updateMatrixWorld();
    this.camera.matrixWorld.decompose(
      this.cameraPosition,
      this.cameraQuaternion,
      this.cameraScale
    );

    this.eye.copy(this.cameraPosition).sub(this.worldPosition).normalize();

    super.updateMatrixWorld();
  };

  private pointerHover = (pointer: TransformControlsPointerObject): void => {
    if (this.object === undefined || this.dragging === true) return;

    this.raycaster.setFromCamera(pointer, this.camera);

    const intersect = intersectObjectWithRay(
      this.gizmo.picker[this.mode],
      this.raycaster
    );

    if (intersect) {
      this.axis = intersect.object.name;
    } else {
      this.axis = null;
    }
  };

  private pointerDown = (pointer: TransformControlsPointerObject): void => {
    if (
      this.object === undefined ||
      this.dragging === true ||
      pointer.button !== 0
    )
      return;

    if (this.axis !== null) {
      this.raycaster.setFromCamera(pointer, this.camera);

      const planeIntersect = intersectObjectWithRay(
        this.plane,
        this.raycaster,
        true
      );

      if (planeIntersect) {
        let space = this.space;

        if (this.mode === "scale") {
          space = "local";
        } else if (
          this.axis === "E" ||
          this.axis === "XYZE" ||
          this.axis === "XYZ"
        ) {
          space = "world";
        }

        if (space === "local" && this.mode === "rotate") {
          const snap = this.rotationSnap;

          if (this.axis === "X" && snap)
            this.object.rotation.x =
              Math.round(this.object.rotation.x / snap) * snap;
          if (this.axis === "Y" && snap)
            this.object.rotation.y =
              Math.round(this.object.rotation.y / snap) * snap;
          if (this.axis === "Z" && snap)
            this.object.rotation.z =
              Math.round(this.object.rotation.z / snap) * snap;
        }

        this.object.updateMatrixWorld();

        if (this.object.parent) {
          this.object.parent.updateMatrixWorld();
        }

        this.positionStart.copy(this.object.position);
        this.quaternionStart.copy(this.object.quaternion);
        this.scaleStart.copy(this.object.scale);

        this.object.matrixWorld.decompose(
          this.worldPositionStart,
          this.worldQuaternionStart,
          this.worldScaleStart
        );

        this.pointStart.copy(planeIntersect.point).sub(this.worldPositionStart);
      }

      this.dragging = true;
      this.mouseDownEvent.mode = this.mode;
      this.dispatchEvent(this.mouseDownEvent);
    }
  };

  private pointerMove = (pointer: TransformControlsPointerObject): void => {
    const axis = this.axis;
    const mode = this.mode;
    const object = this.object;
    let space = this.space;

    if (mode === "scale") {
      space = "local";
    } else if (axis === "E" || axis === "XYZE" || axis === "XYZ") {
      space = "world";
    }

    if (
      object === undefined ||
      axis === null ||
      this.dragging === false ||
      pointer.button !== -1
    )
      return;

    this.raycaster.setFromCamera(pointer, this.camera);

    const planeIntersect = intersectObjectWithRay(
      this.plane,
      this.raycaster,
      true
    );

    if (!planeIntersect) return;

    this.pointEnd.copy(planeIntersect.point).sub(this.worldPositionStart);

    if (mode === "translate") {
      // Apply translate

      this.offset.copy(this.pointEnd).sub(this.pointStart);

      if (space === "local" && axis !== "XYZ") {
        this.offset.applyQuaternion(this.worldQuaternionInv);
      }

      if (axis.indexOf("X") === -1) this.offset.x = 0;
      if (axis.indexOf("Y") === -1) this.offset.y = 0;
      if (axis.indexOf("Z") === -1) this.offset.z = 0;

      if (space === "local" && axis !== "XYZ") {
        this.offset
          .applyQuaternion(this.quaternionStart)
          .divide(this.parentScale);
      } else {
        this.offset
          .applyQuaternion(this.parentQuaternionInv)
          .divide(this.parentScale);
      }

      object.position.copy(this.offset).add(this.positionStart);

      // Apply translation snap

      if (this.translationSnap) {
        if (space === "local") {
          object.position.applyQuaternion(
            this.tempQuaternion.copy(this.quaternionStart).invert()
          );

          if (axis.search("X") !== -1) {
            object.position.x =
              Math.round(object.position.x / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Y") !== -1) {
            object.position.y =
              Math.round(object.position.y / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Z") !== -1) {
            object.position.z =
              Math.round(object.position.z / this.translationSnap) *
              this.translationSnap;
          }

          object.position.applyQuaternion(this.quaternionStart);
        }

        if (space === "world") {
          if (object.parent) {
            object.position.add(
              this.tempVector.setFromMatrixPosition(object.parent.matrixWorld)
            );
          }

          if (axis.search("X") !== -1) {
            object.position.x =
              Math.round(object.position.x / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Y") !== -1) {
            object.position.y =
              Math.round(object.position.y / this.translationSnap) *
              this.translationSnap;
          }

          if (axis.search("Z") !== -1) {
            object.position.z =
              Math.round(object.position.z / this.translationSnap) *
              this.translationSnap;
          }

          if (object.parent) {
            object.position.sub(
              this.tempVector.setFromMatrixPosition(object.parent.matrixWorld)
            );
          }
        }
      }
    } else if (mode === "scale") {
      if (axis.search("XYZ") !== -1) {
        let d = this.pointEnd.length() / this.pointStart.length();

        if (this.pointEnd.dot(this.pointStart) < 0) d *= -1;

        this.tempVector2.set(d, d, d);
      } else {
        this.tempVector.copy(this.pointStart);
        this.tempVector2.copy(this.pointEnd);

        this.tempVector.applyQuaternion(this.worldQuaternionInv);
        this.tempVector2.applyQuaternion(this.worldQuaternionInv);

        this.tempVector2.divide(this.tempVector);

        if (axis.search("X") === -1) {
          this.tempVector2.x = 1;
        }

        if (axis.search("Y") === -1) {
          this.tempVector2.y = 1;
        }

        if (axis.search("Z") === -1) {
          this.tempVector2.z = 1;
        }
      }

      // Apply scale

      object.scale.copy(this.scaleStart).multiply(this.tempVector2);

      if (this.scaleSnap && this.object) {
        if (axis.search("X") !== -1) {
          this.object.scale.x =
            Math.round(object.scale.x / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }

        if (axis.search("Y") !== -1) {
          object.scale.y =
            Math.round(object.scale.y / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }

        if (axis.search("Z") !== -1) {
          object.scale.z =
            Math.round(object.scale.z / this.scaleSnap) * this.scaleSnap ||
            this.scaleSnap;
        }
      }
    } else if (mode === "rotate") {
      this.offset.copy(this.pointEnd).sub(this.pointStart);

      const ROTATION_SPEED =
        20 /
        this.worldPosition.distanceTo(
          this.tempVector.setFromMatrixPosition(this.camera.matrixWorld)
        );

      if (axis === "E") {
        this.rotationAxis.copy(this.eye);
        this.rotationAngle = this.pointEnd.angleTo(this.pointStart);

        this.startNorm.copy(this.pointStart).normalize();
        this.endNorm.copy(this.pointEnd).normalize();

        this.rotationAngle *=
          this.endNorm.cross(this.startNorm).dot(this.eye) < 0 ? 1 : -1;
      } else if (axis === "XYZE") {
        this.rotationAxis.copy(this.offset).cross(this.eye).normalize();
        this.rotationAngle =
          this.offset.dot(
            this.tempVector.copy(this.rotationAxis).cross(this.eye)
          ) * ROTATION_SPEED;
      } else if (axis === "X" || axis === "Y" || axis === "Z") {
        this.rotationAxis.copy(this.unit[axis]);

        this.tempVector.copy(this.unit[axis]);

        if (space === "local") {
          this.tempVector.applyQuaternion(this.worldQuaternion);
        }

        this.rotationAngle =
          this.offset.dot(this.tempVector.cross(this.eye).normalize()) *
          ROTATION_SPEED;
      }

      // Apply rotation snap

      if (this.rotationSnap) {
        this.rotationAngle =
          Math.round(this.rotationAngle / this.rotationSnap) *
          this.rotationSnap;
      }

      // Apply rotate
      if (space === "local" && axis !== "E" && axis !== "XYZE") {
        object.quaternion.copy(this.quaternionStart);
        object.quaternion
          .multiply(
            this.tempQuaternion.setFromAxisAngle(
              this.rotationAxis,
              this.rotationAngle
            )
          )
          .normalize();
      } else {
        this.rotationAxis.applyQuaternion(this.parentQuaternionInv);
        object.quaternion.copy(
          this.tempQuaternion.setFromAxisAngle(
            this.rotationAxis,
            this.rotationAngle
          )
        );
        object.quaternion.multiply(this.quaternionStart).normalize();
      }
    }

    this.dispatchEvent(this.changeEvent);
    this.dispatchEvent(this.objectChangeEvent);
  };

  private pointerUp = (pointer: TransformControlsPointerObject): void => {
    if (pointer.button !== 0) return;

    if (this.dragging && this.axis !== null) {
      this.mouseUpEvent.mode = this.mode;
      this.dispatchEvent(this.mouseUpEvent);
    }

    this.dragging = false;
    this.axis = null;
  };

  private getPointer = (event: Event): TransformControlsPointerObject => {
    if (this.domElement && this.domElement.ownerDocument?.pointerLockElement) {
      return {
        x: 0,
        y: 0,
        button: (event as MouseEvent).button,
      };
    } else {
      const pointer = (event as TouchEvent).changedTouches
        ? (event as TouchEvent).changedTouches[0]
        : (event as MouseEvent);

      const rect = (this.domElement as HTMLElement)?.getBoundingClientRect();

      return {
        x: ((pointer.clientX - rect.left) / rect.width) * 2 - 1,
        y: (-(pointer.clientY - rect.top) / rect.height) * 2 + 1,
        button: (event as MouseEvent).button,
      };
    }
  };

  private onPointerHover = (event: Event): void => {
    if (!this.enabled) return;

    switch ((event as PointerEvent).pointerType) {
      case "mouse":
      case "pen":
        this.pointerHover(this.getPointer(event));
        break;
    }
  };

  private onPointerDown = (event: Event): void => {
    if (!this.enabled) return;
    (this.domElement as HTMLElement).style.touchAction = "none"; // disable touch scroll
    this.domElement.ownerDocument?.addEventListener(
      "pointermove",
      this.onPointerMove
    );

    this.pointerHover(this.getPointer(event));
    this.pointerDown(this.getPointer(event));
  };

  private onPointerMove = (event: Event): void => {
    if (!this.enabled) return;

    this.pointerMove(this.getPointer(event));
  };

  private onPointerUp = (event: Event): void => {
    if (!this.enabled) return;
    (this.domElement as HTMLElement).style.touchAction = "";
    this.domElement.ownerDocument?.removeEventListener(
      "pointermove",
      this.onPointerMove
    );

    this.pointerUp(this.getPointer(event));
  };

  public dispose = (): void => {
    this.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.domElement.removeEventListener("pointermove", this.onPointerHover);
    this.domElement.ownerDocument?.removeEventListener(
      "pointermove",
      this.onPointerMove
    );
    this.domElement.ownerDocument?.removeEventListener(
      "pointerup",
      this.onPointerUp
    );

    this.traverse((child) => {
      const mesh = child as Mesh<BufferGeometry, Material>;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        mesh.material.dispose();
      }
    });
  };
}

export { TransformControls, TransformControlsGizmo, TransformControlsPlane };
