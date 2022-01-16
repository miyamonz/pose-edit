import {
  Color,
  Euler,
  Matrix4,
  Object3D,
  OrthographicCamera,
  PerspectiveCamera,
  Quaternion,
  Vector3,
} from "three";

// TODO: every TransformControlsGizmo share same material
import { helperTranslate } from "./gizmoMaterial";
import { helperScale } from "./gizmoMaterial";
import { helperRotate } from "./gizmoMaterial";
import { pickerTranslate } from "./gizmoMaterial";
import { pickerScale } from "./gizmoMaterial";
import { pickerRotate } from "./gizmoMaterial";
import { gizmoTranslate } from "./gizmoMaterial";
import { gizmoScale } from "./gizmoMaterial";
import { gizmoRotate } from "./gizmoMaterial";

type TransformControlsGizmoPrivateGizmos = {
  ["translate"]: Object3D;
  ["scale"]: Object3D;
  ["rotate"]: Object3D;
  ["visible"]: boolean;
};
export class TransformControlsGizmo extends Object3D {
  public type = "TransformControlsGizmo";

  private tempVector = new Vector3(0, 0, 0);
  private tempEuler = new Euler();
  private alignVector = new Vector3(0, 1, 0);
  private zeroVector = new Vector3(0, 0, 0);
  private lookAtMatrix = new Matrix4();
  private tempQuaternion = new Quaternion();
  private tempQuaternion2 = new Quaternion();
  private identityQuaternion = new Quaternion();

  private unitX = new Vector3(1, 0, 0);
  private unitY = new Vector3(0, 1, 0);
  private unitZ = new Vector3(0, 0, 1);

  private gizmo: TransformControlsGizmoPrivateGizmos;
  public picker: TransformControlsGizmoPrivateGizmos;
  private helper: TransformControlsGizmoPrivateGizmos;

  // these are set from parent class TransformControls
  private rotationAxis = new Vector3();

  private cameraPosition = new Vector3();

  private worldPositionStart = new Vector3();
  private worldQuaternionStart = new Quaternion();

  private worldPosition = new Vector3();
  private worldQuaternion = new Quaternion();

  private eye = new Vector3();

  private camera: PerspectiveCamera | OrthographicCamera = null!;
  private enabled = true;
  private axis: string | null = null;
  private mode: "translate" | "rotate" | "scale" = "translate";
  private space = "world";
  private size = 1;
  private dragging = false;
  private showX = true;
  private showY = true;
  private showZ = true;

  constructor() {
    super();

    // Creates an Object3D with gizmos described in custom hierarchy definition.
    // this is nearly impossible to Type so i'm leaving it
    const setupGizmo = (gizmoMap: any): Object3D => {
      const gizmo = new Object3D();

      for (let name in gizmoMap) {
        for (let i = gizmoMap[name].length; i--; ) {
          const object = gizmoMap[name][i][0].clone();
          const position = gizmoMap[name][i][1];
          const rotation = gizmoMap[name][i][2];
          const scale = gizmoMap[name][i][3];
          const tag = gizmoMap[name][i][4];

          // name and tag properties are essential for picking and updating logic.
          object.name = name;
          // @ts-ignore
          object.tag = tag;

          if (position) {
            object.position.set(position[0], position[1], position[2]);
          }

          if (rotation) {
            object.rotation.set(rotation[0], rotation[1], rotation[2]);
          }

          if (scale) {
            object.scale.set(scale[0], scale[1], scale[2]);
          }

          object.updateMatrix();

          const tempGeometry = object.geometry.clone();
          tempGeometry.applyMatrix4(object.matrix);
          object.geometry = tempGeometry;
          object.renderOrder = Infinity;

          object.position.set(0, 0, 0);
          object.rotation.set(0, 0, 0);
          object.scale.set(1, 1, 1);

          gizmo.add(object);
        }
      }

      return gizmo;
    };

    this.gizmo = {} as TransformControlsGizmoPrivateGizmos;
    this.picker = {} as TransformControlsGizmoPrivateGizmos;
    this.helper = {} as TransformControlsGizmoPrivateGizmos;

    this.add((this.gizmo["translate"] = setupGizmo(gizmoTranslate)));
    this.add((this.gizmo["rotate"] = setupGizmo(gizmoRotate)));
    this.add((this.gizmo["scale"] = setupGizmo(gizmoScale)));
    this.add((this.picker["translate"] = setupGizmo(pickerTranslate)));
    this.add((this.picker["rotate"] = setupGizmo(pickerRotate)));
    this.add((this.picker["scale"] = setupGizmo(pickerScale)));
    this.add((this.helper["translate"] = setupGizmo(helperTranslate)));
    this.add((this.helper["rotate"] = setupGizmo(helperRotate)));
    this.add((this.helper["scale"] = setupGizmo(helperScale)));

    // Pickers should be hidden always
    this.picker["translate"].visible = false;
    this.picker["rotate"].visible = false;
    this.picker["scale"].visible = false;
  }

  // updateMatrixWorld will update transformations and appearance of individual handles
  public updateMatrixWorld = (): void => {
    let space = this.space;

    if (this.mode === "scale") {
      space = "local"; // scale always oriented to local rotation
    }

    const quaternion =
      space === "local" ? this.worldQuaternion : this.identityQuaternion;

    // Show only gizmos for current transform mode
    this.gizmo["translate"].visible = this.mode === "translate";
    this.gizmo["rotate"].visible = this.mode === "rotate";
    this.gizmo["scale"].visible = this.mode === "scale";

    this.helper["translate"].visible = this.mode === "translate";
    this.helper["rotate"].visible = this.mode === "rotate";
    this.helper["scale"].visible = this.mode === "scale";

    let handles: Array<Object3D & { tag?: string }> = [
      ...this.picker[this.mode].children,
      ...this.gizmo[this.mode].children,
      ...this.helper[this.mode].children,
    ];

    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i];

      // hide aligned to camera
      handle.visible = true;
      handle.rotation.set(0, 0, 0);
      handle.position.copy(this.worldPosition);

      let factor;

      if ((this.camera as OrthographicCamera).isOrthographicCamera) {
        factor =
          ((this.camera as OrthographicCamera).top -
            (this.camera as OrthographicCamera).bottom) /
          (this.camera as OrthographicCamera).zoom;
      } else {
        factor =
          this.worldPosition.distanceTo(this.cameraPosition) *
          Math.min(
            (1.9 *
              Math.tan(
                (Math.PI * (this.camera as PerspectiveCamera).fov) / 360
              )) /
              this.camera.zoom,
            7
          );
      }

      handle.scale.set(1, 1, 1).multiplyScalar((factor * this.size) / 7);

      // TODO: simplify helpers and consider decoupling from gizmo
      if (handle.tag === "helper") {
        handle.visible = false;

        if (handle.name === "AXIS") {
          handle.position.copy(this.worldPositionStart);
          handle.visible = !!this.axis;

          if (this.axis === "X") {
            this.tempQuaternion.setFromEuler(this.tempEuler.set(0, 0, 0));
            handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);

            if (
              Math.abs(
                this.alignVector
                  .copy(this.unitX)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "Y") {
            this.tempQuaternion.setFromEuler(
              this.tempEuler.set(0, 0, Math.PI / 2)
            );
            handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);

            if (
              Math.abs(
                this.alignVector
                  .copy(this.unitY)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "Z") {
            this.tempQuaternion.setFromEuler(
              this.tempEuler.set(0, Math.PI / 2, 0)
            );
            handle.quaternion.copy(quaternion).multiply(this.tempQuaternion);

            if (
              Math.abs(
                this.alignVector
                  .copy(this.unitZ)
                  .applyQuaternion(quaternion)
                  .dot(this.eye)
              ) > 0.9
            ) {
              handle.visible = false;
            }
          }

          if (this.axis === "XYZE") {
            this.tempQuaternion.setFromEuler(
              this.tempEuler.set(0, Math.PI / 2, 0)
            );
            this.alignVector.copy(this.rotationAxis);
            handle.quaternion.setFromRotationMatrix(
              this.lookAtMatrix.lookAt(
                this.zeroVector,
                this.alignVector,
                this.unitY
              )
            );
            handle.quaternion.multiply(this.tempQuaternion);
            handle.visible = this.dragging;
          }

          if (this.axis === "E") {
            handle.visible = false;
          }
        } else if (handle.name === "START") {
          handle.position.copy(this.worldPositionStart);
          handle.visible = this.dragging;
        } else if (handle.name === "END") {
          handle.position.copy(this.worldPosition);
          handle.visible = this.dragging;
        } else if (handle.name === "DELTA") {
          handle.position.copy(this.worldPositionStart);
          handle.quaternion.copy(this.worldQuaternionStart);
          this.tempVector
            .set(1e-10, 1e-10, 1e-10)
            .add(this.worldPositionStart)
            .sub(this.worldPosition)
            .multiplyScalar(-1);
          this.tempVector.applyQuaternion(
            this.worldQuaternionStart.clone().invert()
          );
          handle.scale.copy(this.tempVector);
          handle.visible = this.dragging;
        } else {
          handle.quaternion.copy(quaternion);

          if (this.dragging) {
            handle.position.copy(this.worldPositionStart);
          } else {
            handle.position.copy(this.worldPosition);
          }

          if (this.axis) {
            handle.visible = this.axis.search(handle.name) !== -1;
          }
        }

        // If updating helper, skip rest of the loop
        continue;
      }

      // Align handles to current local or world rotation
      handle.quaternion.copy(quaternion);

      if (this.mode === "translate" || this.mode === "scale") {
        // Hide translate and scale axis facing the camera
        const AXIS_HIDE_TRESHOLD = 0.99;
        const PLANE_HIDE_TRESHOLD = 0.2;
        const AXIS_FLIP_TRESHOLD = 0.0;

        if (handle.name === "X" || handle.name === "XYZX") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitX)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "Y" || handle.name === "XYZY") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitY)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "Z" || handle.name === "XYZZ") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitZ)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) > AXIS_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "XY") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitZ)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "YZ") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitX)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === "XZ") {
          if (
            Math.abs(
              this.alignVector
                .copy(this.unitY)
                .applyQuaternion(quaternion)
                .dot(this.eye)
            ) < PLANE_HIDE_TRESHOLD
          ) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        // Flip translate and scale axis ocluded behind another axis
        if (handle.name.search("X") !== -1) {
          if (
            this.alignVector
              .copy(this.unitX)
              .applyQuaternion(quaternion)
              .dot(this.eye) < AXIS_FLIP_TRESHOLD
          ) {
            if (handle.tag === "fwd") {
              handle.visible = false;
            } else {
              handle.scale.x *= -1;
            }
          } else if (handle.tag === "bwd") {
            handle.visible = false;
          }
        }

        if (handle.name.search("Y") !== -1) {
          if (
            this.alignVector
              .copy(this.unitY)
              .applyQuaternion(quaternion)
              .dot(this.eye) < AXIS_FLIP_TRESHOLD
          ) {
            if (handle.tag === "fwd") {
              handle.visible = false;
            } else {
              handle.scale.y *= -1;
            }
          } else if (handle.tag === "bwd") {
            handle.visible = false;
          }
        }

        if (handle.name.search("Z") !== -1) {
          if (
            this.alignVector
              .copy(this.unitZ)
              .applyQuaternion(quaternion)
              .dot(this.eye) < AXIS_FLIP_TRESHOLD
          ) {
            if (handle.tag === "fwd") {
              handle.visible = false;
            } else {
              handle.scale.z *= -1;
            }
          } else if (handle.tag === "bwd") {
            handle.visible = false;
          }
        }
      } else if (this.mode === "rotate") {
        // Align handles to current local or world rotation
        this.tempQuaternion2.copy(quaternion);
        this.alignVector
          .copy(this.eye)
          .applyQuaternion(this.tempQuaternion.copy(quaternion).invert());

        if (handle.name.search("E") !== -1) {
          handle.quaternion.setFromRotationMatrix(
            this.lookAtMatrix.lookAt(this.eye, this.zeroVector, this.unitY)
          );
        }

        if (handle.name === "X") {
          this.tempQuaternion.setFromAxisAngle(
            this.unitX,
            Math.atan2(-this.alignVector.y, this.alignVector.z)
          );
          this.tempQuaternion.multiplyQuaternions(
            this.tempQuaternion2,
            this.tempQuaternion
          );
          handle.quaternion.copy(this.tempQuaternion);
        }

        if (handle.name === "Y") {
          this.tempQuaternion.setFromAxisAngle(
            this.unitY,
            Math.atan2(this.alignVector.x, this.alignVector.z)
          );
          this.tempQuaternion.multiplyQuaternions(
            this.tempQuaternion2,
            this.tempQuaternion
          );
          handle.quaternion.copy(this.tempQuaternion);
        }

        if (handle.name === "Z") {
          this.tempQuaternion.setFromAxisAngle(
            this.unitZ,
            Math.atan2(this.alignVector.y, this.alignVector.x)
          );
          this.tempQuaternion.multiplyQuaternions(
            this.tempQuaternion2,
            this.tempQuaternion
          );
          handle.quaternion.copy(this.tempQuaternion);
        }
      }

      // Hide disabled axes
      handle.visible &&= handle.name.indexOf("X") === -1 || this.showX;
      handle.visible &&= handle.name.indexOf("Y") === -1 || this.showY;
      handle.visible &&= handle.name.indexOf("Z") === -1 || this.showZ;
      handle.visible &&=
        handle.name.indexOf("E") === -1 ||
        (this.showX && this.showY && this.showZ);

      // highlight selected axis
      //@ts-ignore
      handle.material.tempOpacity ||= handle.material.opacity;
      //@ts-ignore
      handle.material.tempColor ||= handle.material.color.clone();
      //@ts-ignore
      handle.material.color.copy(handle.material.tempColor);
      //@ts-ignore
      handle.material.opacity = handle.material.tempOpacity;

      if (!this.enabled) {
        //@ts-ignore
        handle.material.opacity *= 0.5;
        //@ts-ignore
        handle.material.color.lerp(new Color(1, 1, 1), 0.5);
      } else if (this.axis) {
        if (handle.name === this.axis) {
          //@ts-ignore
          handle.material.opacity = 1.0;
          //@ts-ignore
          handle.material.color.lerp(new Color(1, 1, 1), 0.5);
        } else if (
          this.axis.split("").some(function (a) {
            return handle.name === a;
          })
        ) {
          //@ts-ignore
          handle.material.opacity = 1.0;
          //@ts-ignore
          handle.material.color.lerp(new Color(1, 1, 1), 0.5);
        } else {
          //@ts-ignore
          handle.material.opacity *= 0.25;
          //@ts-ignore
          handle.material.color.lerp(new Color(1, 1, 1), 0.5);
        }
      }
    }

    super.updateMatrixWorld();
  };
}
