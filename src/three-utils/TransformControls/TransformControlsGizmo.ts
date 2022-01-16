import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Float32BufferAttribute,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  OctahedronGeometry,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three";

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

    const gizmoMaterial = new MeshBasicMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: true,
      side: DoubleSide,
      fog: false,
      toneMapped: false,
    });

    const gizmoLineMaterial = new LineBasicMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: true,
      linewidth: 1,
      fog: false,
      toneMapped: false,
    });

    // Make unique material for each axis/color
    const matInvisible = gizmoMaterial.clone();
    matInvisible.opacity = 0.15;

    const matHelper = gizmoMaterial.clone();
    matHelper.opacity = 0.33;

    const matRed = gizmoMaterial.clone() as MeshBasicMaterial;
    matRed.color.set(0xff0000);

    const matGreen = gizmoMaterial.clone() as MeshBasicMaterial;
    matGreen.color.set(0x00ff00);

    const matBlue = gizmoMaterial.clone() as MeshBasicMaterial;
    matBlue.color.set(0x0000ff);

    const matWhiteTransparent = gizmoMaterial.clone() as MeshBasicMaterial;
    matWhiteTransparent.opacity = 0.25;

    const matYellowTransparent =
      matWhiteTransparent.clone() as MeshBasicMaterial;
    matYellowTransparent.color.set(0xffff00);

    const matCyanTransparent = matWhiteTransparent.clone() as MeshBasicMaterial;
    matCyanTransparent.color.set(0x00ffff);

    const matMagentaTransparent =
      matWhiteTransparent.clone() as MeshBasicMaterial;
    matMagentaTransparent.color.set(0xff00ff);

    const matYellow = gizmoMaterial.clone() as MeshBasicMaterial;
    matYellow.color.set(0xffff00);

    const matLineRed = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineRed.color.set(0xff0000);

    const matLineGreen = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineGreen.color.set(0x00ff00);

    const matLineBlue = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineBlue.color.set(0x0000ff);

    const matLineCyan = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineCyan.color.set(0x00ffff);

    const matLineMagenta = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineMagenta.color.set(0xff00ff);

    const matLineYellow = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineYellow.color.set(0xffff00);

    const matLineGray = gizmoLineMaterial.clone() as LineBasicMaterial;
    matLineGray.color.set(0x787878);

    const matLineYellowTransparent = matLineYellow.clone() as LineBasicMaterial;
    matLineYellowTransparent.opacity = 0.25;

    // reusable geometry
    const arrowGeometry = new CylinderGeometry(0, 0.05, 0.2, 12, 1, false);

    const scaleHandleGeometry = new BoxGeometry(0.125, 0.125, 0.125);

    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute(
      "position",
      new Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3)
    );

    const CircleGeometry = (radius: number, arc: number): BufferGeometry => {
      const geometry = new BufferGeometry();
      const vertices = [];

      for (let i = 0; i <= 64 * arc; ++i) {
        vertices.push(
          0,
          Math.cos((i / 32) * Math.PI) * radius,
          Math.sin((i / 32) * Math.PI) * radius
        );
      }

      geometry.setAttribute(
        "position",
        new Float32BufferAttribute(vertices, 3)
      );

      return geometry;
    };

    // Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position
    const TranslateHelperGeometry = (): BufferGeometry => {
      const geometry = new BufferGeometry();

      geometry.setAttribute(
        "position",
        new Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3)
      );

      return geometry;
    };

    // Gizmo definitions - custom hierarchy definitions for setupGizmo() function
    const gizmoTranslate = {
      X: [
        [
          new Mesh(arrowGeometry, matRed),
          [1, 0, 0],
          [0, 0, -Math.PI / 2],
          null,
          "fwd",
        ],
        [
          new Mesh(arrowGeometry, matRed),
          [1, 0, 0],
          [0, 0, Math.PI / 2],
          null,
          "bwd",
        ],
        [new Line(lineGeometry, matLineRed)],
      ],
      Y: [
        [new Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, "fwd"],
        [
          new Mesh(arrowGeometry, matGreen),
          [0, 1, 0],
          [Math.PI, 0, 0],
          null,
          "bwd",
        ],
        [new Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]],
      ],
      Z: [
        [
          new Mesh(arrowGeometry, matBlue),
          [0, 0, 1],
          [Math.PI / 2, 0, 0],
          null,
          "fwd",
        ],
        [
          new Mesh(arrowGeometry, matBlue),
          [0, 0, 1],
          [-Math.PI / 2, 0, 0],
          null,
          "bwd",
        ],
        [new Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0]],
      ],
      XYZ: [
        [
          new Mesh(new OctahedronGeometry(0.1, 0), matWhiteTransparent.clone()),
          [0, 0, 0],
          [0, 0, 0],
        ],
      ],
      XY: [
        [
          new Mesh(
            new PlaneGeometry(0.295, 0.295),
            matYellowTransparent.clone()
          ),
          [0.15, 0.15, 0],
        ],
        [
          new Line(lineGeometry, matLineYellow),
          [0.18, 0.3, 0],
          null,
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineYellow),
          [0.3, 0.18, 0],
          [0, 0, Math.PI / 2],
          [0.125, 1, 1],
        ],
      ],
      YZ: [
        [
          new Mesh(new PlaneGeometry(0.295, 0.295), matCyanTransparent.clone()),
          [0, 0.15, 0.15],
          [0, Math.PI / 2, 0],
        ],
        [
          new Line(lineGeometry, matLineCyan),
          [0, 0.18, 0.3],
          [0, 0, Math.PI / 2],
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineCyan),
          [0, 0.3, 0.18],
          [0, -Math.PI / 2, 0],
          [0.125, 1, 1],
        ],
      ],
      XZ: [
        [
          new Mesh(
            new PlaneGeometry(0.295, 0.295),
            matMagentaTransparent.clone()
          ),
          [0.15, 0, 0.15],
          [-Math.PI / 2, 0, 0],
        ],
        [
          new Line(lineGeometry, matLineMagenta),
          [0.18, 0, 0.3],
          null,
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineMagenta),
          [0.3, 0, 0.18],
          [0, -Math.PI / 2, 0],
          [0.125, 1, 1],
        ],
      ],
    };

    const pickerTranslate = {
      X: [
        [
          new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
          [0.6, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      Y: [
        [
          new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
          [0, 0.6, 0],
        ],
      ],
      Z: [
        [
          new Mesh(new CylinderGeometry(0.2, 0, 1, 4, 1, false), matInvisible),
          [0, 0, 0.6],
          [Math.PI / 2, 0, 0],
        ],
      ],
      XYZ: [[new Mesh(new OctahedronGeometry(0.2, 0), matInvisible)]],
      XY: [
        [new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]],
      ],
      YZ: [
        [
          new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible),
          [0, 0.2, 0.2],
          [0, Math.PI / 2, 0],
        ],
      ],
      XZ: [
        [
          new Mesh(new PlaneGeometry(0.4, 0.4), matInvisible),
          [0.2, 0, 0.2],
          [-Math.PI / 2, 0, 0],
        ],
      ],
    };

    const helperTranslate = {
      START: [
        [
          new Mesh(new OctahedronGeometry(0.01, 2), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      END: [
        [
          new Mesh(new OctahedronGeometry(0.01, 2), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      DELTA: [
        [
          new Line(TranslateHelperGeometry(), matHelper),
          null,
          null,
          null,
          "helper",
        ],
      ],
      X: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Y: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [0, -1e3, 0],
          [0, 0, Math.PI / 2],
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Z: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [0, 0, -1e3],
          [0, -Math.PI / 2, 0],
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const gizmoRotate = {
      X: [
        [new Line(CircleGeometry(1, 0.5), matLineRed)],
        [
          new Mesh(new OctahedronGeometry(0.04, 0), matRed),
          [0, 0, 0.99],
          null,
          [1, 3, 1],
        ],
      ],
      Y: [
        [
          new Line(CircleGeometry(1, 0.5), matLineGreen),
          null,
          [0, 0, -Math.PI / 2],
        ],
        [
          new Mesh(new OctahedronGeometry(0.04, 0), matGreen),
          [0, 0, 0.99],
          null,
          [3, 1, 1],
        ],
      ],
      Z: [
        [
          new Line(CircleGeometry(1, 0.5), matLineBlue),
          null,
          [0, Math.PI / 2, 0],
        ],
        [
          new Mesh(new OctahedronGeometry(0.04, 0), matBlue),
          [0.99, 0, 0],
          null,
          [1, 3, 1],
        ],
      ],
      E: [
        [
          new Line(CircleGeometry(1.25, 1), matLineYellowTransparent),
          null,
          [0, Math.PI / 2, 0],
        ],
        [
          new Mesh(
            new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
            matLineYellowTransparent
          ),
          [1.17, 0, 0],
          [0, 0, -Math.PI / 2],
          [1, 1, 0.001],
        ],
        [
          new Mesh(
            new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
            matLineYellowTransparent
          ),
          [-1.17, 0, 0],
          [0, 0, Math.PI / 2],
          [1, 1, 0.001],
        ],
        [
          new Mesh(
            new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
            matLineYellowTransparent
          ),
          [0, -1.17, 0],
          [Math.PI, 0, 0],
          [1, 1, 0.001],
        ],
        [
          new Mesh(
            new CylinderGeometry(0.03, 0, 0.15, 4, 1, false),
            matLineYellowTransparent
          ),
          [0, 1.17, 0],
          [0, 0, 0],
          [1, 1, 0.001],
        ],
      ],
      XYZE: [
        [
          new Line(CircleGeometry(1, 1), matLineGray),
          null,
          [0, Math.PI / 2, 0],
        ],
      ],
    };

    const helperRotate = {
      AXIS: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    const pickerRotate = {
      X: [
        [
          new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
          [0, 0, 0],
          [0, -Math.PI / 2, -Math.PI / 2],
        ],
      ],
      Y: [
        [
          new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
          [0, 0, 0],
          [Math.PI / 2, 0, 0],
        ],
      ],
      Z: [
        [
          new Mesh(new TorusGeometry(1, 0.1, 4, 24), matInvisible),
          [0, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      E: [[new Mesh(new TorusGeometry(1.25, 0.1, 2, 24), matInvisible)]],
      XYZE: [[new Mesh(new SphereGeometry(0.7, 10, 8), matInvisible)]],
    };

    const gizmoScale = {
      X: [
        [
          new Mesh(scaleHandleGeometry, matRed),
          [0.8, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
        [new Line(lineGeometry, matLineRed), null, null, [0.8, 1, 1]],
      ],
      Y: [
        [new Mesh(scaleHandleGeometry, matGreen), [0, 0.8, 0]],
        [
          new Line(lineGeometry, matLineGreen),
          null,
          [0, 0, Math.PI / 2],
          [0.8, 1, 1],
        ],
      ],
      Z: [
        [
          new Mesh(scaleHandleGeometry, matBlue),
          [0, 0, 0.8],
          [Math.PI / 2, 0, 0],
        ],
        [
          new Line(lineGeometry, matLineBlue),
          null,
          [0, -Math.PI / 2, 0],
          [0.8, 1, 1],
        ],
      ],
      XY: [
        [
          new Mesh(scaleHandleGeometry, matYellowTransparent),
          [0.85, 0.85, 0],
          null,
          [2, 2, 0.2],
        ],
        [
          new Line(lineGeometry, matLineYellow),
          [0.855, 0.98, 0],
          null,
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineYellow),
          [0.98, 0.855, 0],
          [0, 0, Math.PI / 2],
          [0.125, 1, 1],
        ],
      ],
      YZ: [
        [
          new Mesh(scaleHandleGeometry, matCyanTransparent),
          [0, 0.85, 0.85],
          null,
          [0.2, 2, 2],
        ],
        [
          new Line(lineGeometry, matLineCyan),
          [0, 0.855, 0.98],
          [0, 0, Math.PI / 2],
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineCyan),
          [0, 0.98, 0.855],
          [0, -Math.PI / 2, 0],
          [0.125, 1, 1],
        ],
      ],
      XZ: [
        [
          new Mesh(scaleHandleGeometry, matMagentaTransparent),
          [0.85, 0, 0.85],
          null,
          [2, 0.2, 2],
        ],
        [
          new Line(lineGeometry, matLineMagenta),
          [0.855, 0, 0.98],
          null,
          [0.125, 1, 1],
        ],
        [
          new Line(lineGeometry, matLineMagenta),
          [0.98, 0, 0.855],
          [0, -Math.PI / 2, 0],
          [0.125, 1, 1],
        ],
      ],
      XYZX: [
        [
          new Mesh(
            new BoxGeometry(0.125, 0.125, 0.125),
            matWhiteTransparent.clone()
          ),
          [1.1, 0, 0],
        ],
      ],
      XYZY: [
        [
          new Mesh(
            new BoxGeometry(0.125, 0.125, 0.125),
            matWhiteTransparent.clone()
          ),
          [0, 1.1, 0],
        ],
      ],
      XYZZ: [
        [
          new Mesh(
            new BoxGeometry(0.125, 0.125, 0.125),
            matWhiteTransparent.clone()
          ),
          [0, 0, 1.1],
        ],
      ],
    };

    const pickerScale = {
      X: [
        [
          new Mesh(
            new CylinderGeometry(0.2, 0, 0.8, 4, 1, false),
            matInvisible
          ),
          [0.5, 0, 0],
          [0, 0, -Math.PI / 2],
        ],
      ],
      Y: [
        [
          new Mesh(
            new CylinderGeometry(0.2, 0, 0.8, 4, 1, false),
            matInvisible
          ),
          [0, 0.5, 0],
        ],
      ],
      Z: [
        [
          new Mesh(
            new CylinderGeometry(0.2, 0, 0.8, 4, 1, false),
            matInvisible
          ),
          [0, 0, 0.5],
          [Math.PI / 2, 0, 0],
        ],
      ],
      XY: [
        [
          new Mesh(scaleHandleGeometry, matInvisible),
          [0.85, 0.85, 0],
          null,
          [3, 3, 0.2],
        ],
      ],
      YZ: [
        [
          new Mesh(scaleHandleGeometry, matInvisible),
          [0, 0.85, 0.85],
          null,
          [0.2, 3, 3],
        ],
      ],
      XZ: [
        [
          new Mesh(scaleHandleGeometry, matInvisible),
          [0.85, 0, 0.85],
          null,
          [3, 0.2, 3],
        ],
      ],
      XYZX: [
        [new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [1.1, 0, 0]],
      ],
      XYZY: [
        [new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [0, 1.1, 0]],
      ],
      XYZZ: [
        [new Mesh(new BoxGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 1.1]],
      ],
    };

    const helperScale = {
      X: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [-1e3, 0, 0],
          null,
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Y: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [0, -1e3, 0],
          [0, 0, Math.PI / 2],
          [1e6, 1, 1],
          "helper",
        ],
      ],
      Z: [
        [
          new Line(lineGeometry, matHelper.clone()),
          [0, 0, -1e3],
          [0, -Math.PI / 2, 0],
          [1e6, 1, 1],
          "helper",
        ],
      ],
    };

    // Creates an Object3D with gizmos described in custom hierarchy definition.
    // this is nearly impossible to Type so i'm leaving it
    const setupGizmo = (gizmoMap: any): Object3D => {
      const gizmo = new Object3D();

      for (let name in gizmoMap) {
        for (let i = gizmoMap[name].length; i--; ) {
          const object = gizmoMap[name][i][0].clone() as Mesh;
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

    let handles: Array<Object3D & { tag?: string }> = [];
    handles = handles.concat(this.picker[this.mode].children);
    handles = handles.concat(this.gizmo[this.mode].children);
    handles = handles.concat(this.helper[this.mode].children);

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
      handle.visible =
        handle.visible && (handle.name.indexOf("X") === -1 || this.showX);
      handle.visible =
        handle.visible && (handle.name.indexOf("Y") === -1 || this.showY);
      handle.visible =
        handle.visible && (handle.name.indexOf("Z") === -1 || this.showZ);
      handle.visible =
        handle.visible &&
        (handle.name.indexOf("E") === -1 ||
          (this.showX && this.showY && this.showZ));

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
