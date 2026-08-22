import { interpolateObject } from 'd3-interpolate';
import { easeCubicInOut } from 'd3-ease';
import { timer } from 'd3-timer';

const rad = (deg) => (deg / 180) * Math.PI;

export const widthToRadius = (fovDeg, width) => width / (2 * Math.tan(0.5 * rad(fovDeg)));
export const radiusToWidth = (fovDeg, r) => r * 2 * Math.tan(0.5 * rad(fovDeg));

export function viewToPosition(v) {
  const r = widthToRadius(v.fov, v.width);
  return {
    x: r * Math.sin(v.azi) * Math.cos(v.phi),
    y: r * Math.cos(v.azi),
    z: r * Math.sin(v.azi) * Math.sin(v.phi),
  };
}

export function readView(camera, target) {
  const r = camera.position.length();
  // atan2 recovers phi over the full (-pi, pi] range directly (since
  // x = k*cos(phi), z = k*sin(phi) with k = r*sin(azi) >= 0), including the
  // pole (x=0, z=0) where atan2(0, 0) is defined as 0 rather than NaN.
  const phi = Math.atan2(camera.position.z, camera.position.x);
  return {
    azi: Math.acos(camera.position.y / r),
    phi,
    fov: camera.fov,
    width: radiusToWidth(camera.fov, r),
    lookat_x: target.x, lookat_y: target.y, lookat_z: target.z,
  };
}

export function tweenView(from, to, onFrame, onDone, duration = 2000) {
  const interp = interpolateObject(from, to);
  const t = timer((elapsed) => {
    const s = Math.min(1, elapsed / duration);
    onFrame(interp(easeCubicInOut(s)));
    if (s >= 1) { t.stop(); onDone && onDone(); }
  });
  return { stop: () => t.stop() };
}
