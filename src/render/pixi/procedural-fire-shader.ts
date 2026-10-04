export const fireVertex = /* glsl */ `
attribute vec2 aPosition;
attribute vec2 aUV;
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;
uniform vec4 uWorldColorAlpha;
uniform vec4 uColor;
varying vec2 vUV;
varying vec4 vColor;
void main() {
  vUV = aUV;
  vColor = uColor * uWorldColorAlpha;
  vec3 position = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix * vec3(aPosition, 1.0);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

// Direct mesh shading: no filter, framebuffer, feedback texture or per-frame upload.
export const fireFragment = /* glsl */ `
precision highp float;
varying vec2 vUV;
varying vec4 vColor;
uniform sampler2D uNoise;
uniform sampler2D uFuel;
uniform vec4 uClock;
uniform vec4 uDomain;
uniform vec4 uShape;
uniform vec2 uSeed;

float noise3(vec3 p) {
  vec3 cell = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  vec2 uv = cell.xy + vec2(37.0, 17.0) * cell.z + f.xy;
  vec2 values = texture2D(uNoise, (uv + 0.5) / 256.0).rg;
  return mix(values.r, values.g, f.z);
}

float turbulence(vec2 p, float time) {
  return noise3(vec3(p, time)) * 0.55
    + noise3(vec3(p * 2.03 + 19.0, time * 2.0)) * 0.27
    + noise3(vec3(p * 4.07 - 11.0, time * 4.0)) * 0.13
    + noise3(vec3(p * 8.11 + 43.0, time * 8.0)) * 0.05;
}

float fuelAt(vec2 p) {
  if (uShape.z > 0.5) {
    float distance = length(p);
    float outer = 1.0 - smoothstep(uShape.x * 0.65, uShape.x, distance);
    float inner = uShape.y > 0.0 ? smoothstep(uShape.y, uShape.y + uShape.w, distance) : 1.0;
    return outer * inner;
  }
  vec2 uv = (p - uDomain.xy) / uDomain.zw;
  return texture2D(uFuel, clamp(uv, 0.0, 1.0)).a;
}

void main() {
  vec2 local = uDomain.xy + vUV * uDomain.zw;
  // Reject empty space before evaluating the expensive turbulent field.
  if (fuelAt(local) < 0.002) discard;
  vec2 p = local + uSeed;
  vec2 flow = vec2(
    turbulence(p * 0.75, uClock.x),
    turbulence(p * 0.75 + 53.0, uClock.y)
  ) - 0.5;
  vec2 bent = local + flow * 0.5;
  float fuel = fuelAt(bent);
  vec2 q = p * 2.8 + flow * 4.0;
  vec4 fire = vec4(0.0);
  // Integrate a shallow hot volume viewed from above, rather than drawing noise contours.
  for (int i = 0; i < 5; i++) {
    float height = float(i) * 0.2;
    vec2 plume = q + flow * height * 1.5;
    float body = turbulence(plume, uClock.z - height * 1.6);
    vec2 curl = plume + vec2(body - 0.5, noise3(vec3(plume + 71.0, uClock.y - height))) * 2.0;
    float detail = noise3(vec3(curl * 5.0, uClock.w - height * 3.0));
    float density = max(0.0, body * 0.72 + detail * 0.28 - 0.54 + fuel * 0.10);
    float heat = clamp(density * 4.5 * fuel, 0.0, 1.0);
    float alpha = smoothstep(0.015, 0.5, heat) * 0.55;
    vec3 color = mix(vec3(1.0, 0.19, 0.008), vec3(1.0, 0.61, 0.08), smoothstep(0.02, 0.3, heat));
    color = mix(color, vec3(1.0, 0.84, 0.35), smoothstep(0.3, 0.72, heat));
    color = mix(color, vec3(1.0, 0.97, 0.76), smoothstep(0.72, 1.0, heat));
    fire.rgb += (1.0 - fire.a) * color * alpha;
    fire.a += (1.0 - fire.a) * alpha;
  }
  gl_FragColor = fire * vColor;
}`;
