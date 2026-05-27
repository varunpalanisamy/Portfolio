export const BILLBOARD_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;

    vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 cameraUp = vec3(0.0, 1.0, 0.0);

    vec3 worldPosition = center
      + cameraRight * position.x
      + cameraUp * position.y;

    gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
  }
`

export const PIXEL_SPRITE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D map;
  uniform vec3 warmTint;
  uniform float alphaCutoff;
  uniform float rimAmount;

  varying vec2 vUv;

  void main() {
    vec4 texel = texture2D(map, vUv);
    if (texel.a < alphaCutoff) discard;

    float edge = smoothstep(alphaCutoff, alphaCutoff + 0.22, texel.a);
    vec3 lit = texel.rgb * warmTint;
    vec3 rim = vec3(1.0, 0.58, 0.28) * rimAmount * (1.0 - edge);

    gl_FragColor = vec4(lit + rim, texel.a);
  }
`

export const SOFT_CONTACT_SHADOW_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 shadowColor;
  uniform float opacity;
  uniform vec2 squash;
  varying vec2 vUv;

  void main() {
    vec2 p = (vUv - 0.5) * squash;
    float d = dot(p, p);
    float alpha = smoothstep(1.0, 0.0, d) * opacity;
    gl_FragColor = vec4(shadowColor, alpha);
  }
`

export const GOD_RAYS_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 lightPosition;
  uniform float exposure;
  uniform float decay;
  uniform float density;
  uniform float weight;

  varying vec2 vUv;

  const int NUM_SAMPLES = 48;

  void main() {
    vec2 delta = (vUv - lightPosition) * density / float(NUM_SAMPLES);
    vec2 coord = vUv;
    float illuminationDecay = 1.0;
    vec4 color = texture2D(tDiffuse, vUv) * 0.76;

    for (int i = 0; i < NUM_SAMPLES; i++) {
      coord -= delta;
      vec4 sampleColor = texture2D(tDiffuse, coord);
      sampleColor *= illuminationDecay * weight;
      color += sampleColor;
      illuminationDecay *= decay;
    }

    gl_FragColor = color * exposure;
  }
`

export const TILT_SHIFT_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform vec2 resolution;
  uniform float focusY;
  uniform float falloff;
  uniform float maxBlur;

  varying vec2 vUv;

  void main() {
    float distFromFocus = abs(vUv.y - focusY);
    float blur = smoothstep(0.0, falloff, distFromFocus) * maxBlur;
    vec2 texel = 1.0 / resolution;

    vec4 color = vec4(0.0);
    color += texture2D(tDiffuse, vUv + vec2(-2.0, 0.0) * texel * blur) * 0.08;
    color += texture2D(tDiffuse, vUv + vec2(-1.0, 0.0) * texel * blur) * 0.16;
    color += texture2D(tDiffuse, vUv) * 0.52;
    color += texture2D(tDiffuse, vUv + vec2(1.0, 0.0) * texel * blur) * 0.16;
    color += texture2D(tDiffuse, vUv + vec2(2.0, 0.0) * texel * blur) * 0.08;

    gl_FragColor = color;
  }
`

export const GAMMA_COLOR_GRADE_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float contrast;
  uniform float saturation;
  uniform vec3 shadows;
  uniform vec3 mids;
  uniform vec3 highlights;

  varying vec2 vUv;

  vec3 grade(vec3 color) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, saturation);
    color = (color - 0.5) * contrast + 0.5;

    float s = smoothstep(0.55, 0.0, luma);
    float h = smoothstep(0.45, 1.0, luma);
    float m = 1.0 - max(s, h);

    return color * (shadows * s + mids * m + highlights * h);
  }

  void main() {
    vec4 color = texture2D(tDiffuse, vUv);
    gl_FragColor = vec4(grade(color.rgb), color.a);
  }
`

