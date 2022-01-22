import { Camera, PerspectiveCamera, Vector3 } from "three";

export class SaveState {
  // save and reset
  target0: Vector3;
  position0: Vector3;
  zoom0: number;

  object: Camera;
  target: Vector3;

  constructor(object: Camera, target: Vector3) {
    this.object = object;
    this.target = target;

    this.position0 = object.position.clone();
    this.zoom0 = object instanceof PerspectiveCamera ? object.zoom : 1;
    this.target0 = target.clone();
  }

  public saveState() {
    this.target0.copy(this.target);
    this.position0.copy(this.object.position);
    this.zoom0 =
      this.object instanceof PerspectiveCamera ? this.object.zoom : 1;
  }

  public reset() {
    this.target.copy(this.target0);
    this.object.position.copy(this.position0);
    if (this.object instanceof PerspectiveCamera) {
      this.object.zoom = this.zoom0;
      this.object.updateProjectionMatrix();
    }
  }
}
