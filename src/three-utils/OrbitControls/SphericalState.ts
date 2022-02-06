import { Camera, Quaternion, Spherical, Vector3 } from "three";

const twoPI = 2 * Math.PI;
const moduloWrapAround = (offset: number, capacity: number) =>
  ((offset % capacity) + capacity) % capacity;

export class SphericalState {
  spherical = new Spherical();
  sphericalDelta = new Spherical();

  //初期化時のcameraへの依存は、up方向を見るだけだな
  constructor(object: Camera) {
    // so camera.up is the orbit axis
    this.quat = new Quaternion().setFromUnitVectors(
      object.up,
      new Vector3(0, 1, 0)
    );
    this.quatInverse = this.quat.clone().invert();
  }

  // fixed orientation when contruct
  quat: Quaternion;
  quatInverse: Quaternion;

  allignSpherical(offset: Vector3) {
    // rotate offset to "y-axis-is-up" space
    offset.applyQuaternion(this.quat);
    // angle from z-axis around y-axis
    this.spherical.setFromVector3(offset);
  }

  v = new Vector3();
  applyObjectTransform(object: Camera, target: Vector3) {
    // update camera postion and rotation
    const offset = this.v.setFromSpherical(this.spherical);
    // rotate offset back to "camera-up-vector-is-up" space
    offset.applyQuaternion(this.quatInverse);
    object.position.copy(target).add(offset);
    object.lookAt(target);
  }

  //public methods
  public getPolarAngle() {
    return this.spherical.phi;
  }
  public getAzimuthalAngle() {
    return this.spherical.theta;
  }

  // setterは呼ばれたらcontrol.updateされないといけないかも
  // でもupdateループ回ってたらよくね？という気持ちもある
  public setPolarAngle(value: number) {
    setPolarAngle(this, value);
  }

  public setAzimuthalAngle(value: number) {
    setAzimuthalAngle(this, value);
  }
}

function setPolarAngle(scope: SphericalState, value: number) {
  // use modulo wrapping to safeguard value
  let phi = moduloWrapAround(value, 2 * Math.PI);
  let currentPhi = scope.spherical.phi;

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
  scope.sphericalDelta.phi = phi - currentPhi;
}

function setAzimuthalAngle(scope: SphericalState, value: number) {
  // use modulo wrapping to safeguard value
  let theta = moduloWrapAround(value, 2 * Math.PI);
  let currentTheta = scope.spherical.theta;

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
  scope.sphericalDelta.theta = theta - currentTheta;
}

export class SphericalDamping {
  enableDamping = true;
  dampingFactor: number;

  restrict = new RestrictSpherical();

  constructor(dampingFactor: number) {
    this.dampingFactor = dampingFactor;
  }
  update(target: Spherical, delta: Spherical) {
    if (this.enableDamping) {
      target.theta += delta.theta * this.dampingFactor;
      target.phi += delta.phi * this.dampingFactor;

      delta.theta *= 1 - this.dampingFactor;
      delta.phi *= 1 - this.dampingFactor;
    } else {
      target.theta += delta.theta;
      target.phi += delta.phi;

      delta.set(0, 0, 0);
    }
    this.restrict.restrictAngle(target);
  }
}
class RestrictSpherical {
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

  restrictAngle(target: Spherical) {
    // theta
    // restrict theta to be between desired limits
    let min = this.minAzimuthAngle;
    let max = this.maxAzimuthAngle;
    if (isFinite(min) && isFinite(max)) {
      target.theta = restrictTheta(min, max, target.theta);
    }

    // phi
    // restrict phi to be between desired limits
    target.phi = Math.max(
      this.minPolarAngle,
      Math.min(this.maxPolarAngle, target.phi)
    );
    target.makeSafe();

    //radius
    // restrict radius to be between desired limits
    target.radius = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, target.radius)
    );
  }
}
function restrictTheta(min: number, max: number, theta: number): number {
  if (min < -Math.PI) min += twoPI;
  else if (min > Math.PI) min -= twoPI;

  if (max < -Math.PI) max += twoPI;
  else if (max > Math.PI) max -= twoPI;

  if (min <= max) {
    return Math.max(min, Math.min(max, theta));
  } else {
    return theta > (min + max) / 2
      ? Math.max(min, theta)
      : Math.min(max, theta);
  }
}
