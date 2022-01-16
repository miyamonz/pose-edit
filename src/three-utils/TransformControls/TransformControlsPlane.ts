import {
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";

export class TransformControlsPlane extends Mesh<
  PlaneGeometry,
  MeshBasicMaterial
> {
  public type = "TransformControlsPlane";

  constructor() {
    super(
      new PlaneGeometry(100000, 100000, 2, 2),
      new MeshBasicMaterial({
        visible: false,
        wireframe: true,
        side: DoubleSide,
        transparent: true,
        opacity: 0.1,
        toneMapped: false,
      })
    );
  }

  private unitX = new Vector3(1, 0, 0);
  private unitY = new Vector3(0, 1, 0);
  private unitZ = new Vector3(0, 0, 1);

  private tempVector = new Vector3();
  private dirVector = new Vector3();
  private alignVector = new Vector3();
  private tempMatrix = new Matrix4();
  private identityQuaternion = new Quaternion();

  // these are set from parent class TransformControls
  private cameraQuaternion = new Quaternion();

  private worldPosition = new Vector3();
  private worldQuaternion = new Quaternion();

  private eye = new Vector3();

  private axis: string | null = null;
  private mode: "translate" | "rotate" | "scale" = "translate";
  private space = "world";

  public updateMatrixWorld = (): void => {
    let space = this.space;

    this.position.copy(this.worldPosition);

    if (this.mode === "scale") space = "local"; // scale always oriented to local rotation

    this.unitX
      .set(1, 0, 0)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : this.identityQuaternion
      );
    this.unitY
      .set(0, 1, 0)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : this.identityQuaternion
      );
    this.unitZ
      .set(0, 0, 1)
      .applyQuaternion(
        space === "local" ? this.worldQuaternion : this.identityQuaternion
      );

    // Align the plane for current transform mode, axis and space.
    this.alignVector.copy(this.unitY);

    switch (this.mode) {
      case "translate":
      case "scale":
        switch (this.axis) {
          case "X":
            this.alignVector.copy(this.eye).cross(this.unitX);
            this.dirVector.copy(this.unitX).cross(this.alignVector);
            break;
          case "Y":
            this.alignVector.copy(this.eye).cross(this.unitY);
            this.dirVector.copy(this.unitY).cross(this.alignVector);
            break;
          case "Z":
            this.alignVector.copy(this.eye).cross(this.unitZ);
            this.dirVector.copy(this.unitZ).cross(this.alignVector);
            break;
          case "XY":
            this.dirVector.copy(this.unitZ);
            break;
          case "YZ":
            this.dirVector.copy(this.unitX);
            break;
          case "XZ":
            this.alignVector.copy(this.unitZ);
            this.dirVector.copy(this.unitY);
            break;
          case "XYZ":
          case "E":
            this.dirVector.set(0, 0, 0);
            break;
        }

        break;
      case "rotate":
      default:
        // special case for rotate
        this.dirVector.set(0, 0, 0);
    }

    if (this.dirVector.length() === 0) {
      // If in rotate mode, make the plane parallel to camera
      this.quaternion.copy(this.cameraQuaternion);
    } else {
      this.tempMatrix.lookAt(
        this.tempVector.set(0, 0, 0),
        this.dirVector,
        this.alignVector
      );

      this.quaternion.setFromRotationMatrix(this.tempMatrix);
    }

    super.updateMatrixWorld();
  };
}
