# Three.js Knowledge Reference — For AI Agents

> Everything an AI agent needs to understand, generate, and debug Three.js code
> in the context of reveal.js presentation backgrounds.

---

## 1. What Is Three.js?

Three.js is a JavaScript library that wraps the WebGL API to create and render 3D graphics in the browser. It provides:

- Scene graph (scenes, groups, hierarchies)
- Cameras (perspective, orthographic)
- Geometries (box, sphere, plane, torus, custom buffer geometry)
- Materials (basic, standard, phong, shader)
- Lights (ambient, directional, point, spot)
- Particle systems (Points + BufferGeometry)
- Post-processing (EffectComposer, bloom, blur)
- Animation loop via `requestAnimationFrame`

**CDN:**
```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160/build/three.min.js"></script>
```

---

## 2. Core Concepts

### 2.1 The Rendering Pipeline

```
Scene  →  Camera  →  Renderer  →  Canvas (DOM element)
  ↑
Objects (Mesh = Geometry + Material)
```

Every Three.js app has:
1. **Scene** — container for all 3D objects
2. **Camera** — defines what the viewer sees
3. **Renderer** — draws the scene to a `<canvas>`
4. **Animation loop** — updates and re-renders each frame

### 2.2 Minimal Setup

```javascript
// 1. Scene
const scene = new THREE.Scene();

// 2. Camera (fov, aspect, near, far)
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 3. Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// 4. Object
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({ color: 0x00d4ff });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// 5. Animation loop
function animate() {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
```

### 2.3 Coordinate System

- **X-axis**: left (−) to right (+)
- **Y-axis**: down (−) to up (+)
- **Z-axis**: into screen (−) to toward viewer (+)
- Units are arbitrary; use whatever scale fits your scene.

---

## 3. Key Objects

### 3.1 Cameras

| Type | Constructor | Use When |
|------|-------------|----------|
| `PerspectiveCamera` | `(fov, aspect, near, far)` | 3D perspective (most common) |
| `OrthographicCamera` | `(left, right, top, bottom, near, far)` | 2D / isometric views |

**Presentation tip:** Use `PerspectiveCamera` with `fov: 50-70` for presentation backgrounds. Lower FOV = flatter, more subtle; higher FOV = more dramatic depth.

### 3.2 Geometries

| Geometry | Constructor | Good For |
|----------|-------------|----------|
| `BoxGeometry` | `(w, h, d)` | Blocks, buildings |
| `SphereGeometry` | `(radius, widthSegs, heightSegs)` | Globes, orbs |
| `PlaneGeometry` | `(w, h, wSegs, hSegs)` | Terrain, waves |
| `TorusGeometry` | `(radius, tube, radialSegs, tubularSegs)` | Rings, tunnels |
| `CylinderGeometry` | `(rTop, rBottom, h, radialSegs)` | Pillars, bars |
| `IcosahedronGeometry` | `(radius, detail)` | Low-poly spheres |
| `BufferGeometry` | (custom) | Particle systems |

**High segment counts** = smoother but slower. For backgrounds, keep segment counts moderate (32-64 for spheres).

### 3.3 Materials

| Material | Shading | Lights Required | Performance |
|----------|---------|-----------------|-------------|
| `MeshBasicMaterial` | None (flat color) | No | Fast |
| `MeshStandardMaterial` | PBR | Yes | Moderate |
| `MeshPhongMaterial` | Phong | Yes | Moderate |
| `MeshLambertMaterial` | Lambert | Yes | Fast |
| `PointsMaterial` | Points | No | Fast |
| `LineBasicMaterial` | Lines | No | Fast |
| `ShaderMaterial` | Custom GLSL | Varies | Varies |

**Presentation tip:** Prefer `MeshBasicMaterial` or `PointsMaterial` for backgrounds — they don't need lights and are fastest.

Key material properties:
```javascript
{
  color: 0x00d4ff,        // Hex color
  wireframe: true,         // Show wireframe
  transparent: true,       // Enable transparency
  opacity: 0.5,           // 0-1
  side: THREE.DoubleSide, // Render both faces
  sizeAttenuation: true,  // Points: shrink with distance
}
```

### 3.4 Lights

| Light | Usage | Presentation Use |
|-------|-------|------------------|
| `AmbientLight(color, intensity)` | Uniform fill | Always add at 0.3-0.5 |
| `DirectionalLight(color, intensity)` | Sun-like | Main light source |
| `PointLight(color, intensity, distance)` | Bulb | Spot accents |
| `SpotLight(color, intensity, distance, angle)` | Cone | Dramatic focus |

**Only needed with Standard/Phong/Lambert materials.** BasicMaterial ignores lights entirely.

---

## 4. Particle Systems

Particles are the most common Three.js element in presentation backgrounds.

### 4.1 Basic Particle Field

```javascript
const count = 1000;
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 20; // Spread across 20 units
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0x00d4ff,
  size: 0.05,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true,
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);
```

### 4.2 Animating Particles

```javascript
function animate() {
  requestAnimationFrame(animate);

  const positions = geometry.attributes.position.array;
  for (let i = 0; i < count; i++) {
    positions[i * 3 + 1] += 0.005; // Move up
    if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = -10; // Wrap
  }
  geometry.attributes.position.needsUpdate = true; // CRITICAL — must set this

  renderer.render(scene, camera);
}
```

### 4.3 Custom Particle Colors

```javascript
const colors = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  colors[i * 3] = Math.random();     // R
  colors[i * 3 + 1] = Math.random(); // G
  colors[i * 3 + 2] = Math.random(); // B
}
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  vertexColors: true,
  size: 0.05,
});
```

---

## 5. Common Presentation Scenes

### 5.1 Floating Particle Field
Best for: general keynotes, tech talks.

```
- 500-1000 particles in a 20×20×20 box
- Slow drift (0.01-0.03 per axis per frame)
- Wrap around when exceeding bounds
- Optional: slow global rotation (0.001 rad/frame)
- Color: match primary accent
```

### 5.2 Wireframe Globe
Best for: global topics, connectivity, network themes.

```
- SphereGeometry(2, 32, 32) with wireframe:true
- 2-3 RingGeometry orbit lines at different angles
- Optional: PointsMaterial dots scattered on sphere surface
- Slow Y-axis rotation (0.002 rad/frame)
```

### 5.3 Wave Surface
Best for: data flow, process, calm motion.

```
- PlaneGeometry(20, 20, 60, 60) with wireframe:true
- Rotate plane -π/2.5 on X to tilt toward viewer
- In update: set z-position per vertex using sin(x + time) * amplitude
- Two or three sin waves with different frequencies for complexity
```

### 5.4 Tunnel / Wormhole
Best for: journey narratives, future vision, immersive.

```
- 20-40 TorusGeometry rings placed along Z-axis at intervals
- Move all rings toward camera each frame
- When ring passes camera, reset to far end
- Alternate colors between primary and secondary
- Fade opacity as rings approach camera
```

### 5.5 Connected Mesh / Network
Best for: AI, data, blockchain, systems.

```
- 30-60 small SphereGeometry nodes at random positions
- Check pairwise distances; draw LineBasicMaterial between close pairs
- Move nodes slowly with random velocity
- Bounce off invisible bounding box walls
- Rebuild connections every ~250ms (not every frame — too expensive)
```

### 5.6 Neural Network
Best for: AI/ML, deep learning, brain themes.

```
- Define layers as arrays (e.g. [4, 6, 8, 6, 4])
- Place nodes in a grid per layer
- Draw lines from every node to every node in the next layer
- Animate a "pulse" — highlight one layer at a time on a timer
- Gentle float on all nodes using sin(time + offset)
```

---

## 6. Integration with Reveal.js

### 6.1 Using the Plugin (threejs-backgrounds.js)

The easiest path — no custom Three.js code needed:

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160/build/three.min.js"></script>
<script src="plugins/threejs-backgrounds.js"></script>

<script>
  Reveal.initialize({
    plugins: [RevealThreeBackground]
  });
</script>

<!-- On any slide: -->
<section data-three-bg="particles" data-three-color="#00d4ff" data-three-opacity="0.5">
  <h1>My Title</h1>
</section>
```

Available `data-three-bg` values: `particles`, `globe`, `waves`, `wormhole`, `mesh`, `neural`.

Config attributes:
| Attribute | Default | Description |
|-----------|---------|-------------|
| `data-three-color` | `#00d4ff` | Primary color |
| `data-three-color2` | `#7c3aed` | Secondary color |
| `data-three-speed` | `1` | Animation speed multiplier |
| `data-three-density` | `1` | Element count multiplier |
| `data-three-opacity` | `0.6` | Canvas opacity |

### 6.2 Custom Scene (Manual)

For complete control, create your own Three.js scene inside a slide:

```html
<section id="custom-scene">
  <canvas id="my-canvas" style="position:absolute;inset:0;z-index:0;pointer-events:none;"></canvas>
  <div style="position:relative;z-index:1;">
    <h1>Content Above 3D</h1>
  </div>
</section>

<script>
  Reveal.on('slidechanged', (event) => {
    if (event.currentSlide.id === 'custom-scene') {
      startMyScene();
    }
  });
</script>
```

### 6.3 Performance Considerations

| Concern | Guideline |
|---------|-----------|
| Particle count | < 2000 for smooth 60fps |
| Geometry segments | 32-64 for spheres/tori |
| Connection rebuilds | Every 200-500ms, not every frame |
| Pixel ratio | Cap at 2: `Math.min(devicePixelRatio, 2)` |
| Unused scenes | Stop `requestAnimationFrame` on hidden slides |
| Post-processing | Avoid unless high-end devices are guaranteed |
| Dispose | Always dispose geometry, material, renderer when done |
| alpha: true | Required for transparent background over slide content |

---

## 7. Shader Basics (Advanced)

For truly custom effects, Three.js supports GLSL vertex and fragment shaders.

### 7.1 ShaderMaterial Template

```javascript
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vec3 pos = position;
      pos.z += sin(pos.x * 2.0 + uTime) * 0.3;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec2 vUv;
    void main() {
      float alpha = smoothstep(0.0, 0.5, vUv.y);
      gl_FragColor = vec4(uColor, alpha * 0.5);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});
```

In the animation loop:
```javascript
material.uniforms.uTime.value = clock.getElapsedTime();
```

### 7.2 Common Shader Effects for Presentations

| Effect | Approach |
|--------|----------|
| Gradient background | Fragment shader with `mix()` based on UV |
| Noise-based terrain | Vertex shader displacing Z using simplex noise |
| Glowing edges | Fragment shader with `pow(1.0 - dot(normal, viewDir), 3.0)` |
| Pulsing opacity | Fragment shader with `sin(uTime) * 0.5 + 0.5` |
| Color cycling | Fragment shader mixing two colors with `sin(uTime)` |

---

## 8. Common Patterns — Copy-Paste Ready

### 8.1 Responsive Resize Handler

```javascript
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});
```

### 8.2 Proper Cleanup / Dispose

```javascript
function dispose() {
  cancelAnimationFrame(animId);

  scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose());
      } else {
        obj.material.dispose();
      }
    }
  });

  renderer.dispose();
  renderer.domElement.remove();
}
```

### 8.3 Color from CSS Custom Property

```javascript
const style = getComputedStyle(document.documentElement);
const primary = style.getPropertyValue('--primary').trim();
const color = new THREE.Color(primary);
```

### 8.4 Mouse Interaction (Optional)

```javascript
const mouse = new THREE.Vector2();
canvas.addEventListener('mousemove', (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// In update loop — rotate camera slightly toward mouse
camera.position.x += (mouse.x * 0.5 - camera.position.x) * 0.05;
camera.position.y += (mouse.y * 0.5 - camera.position.y) * 0.05;
camera.lookAt(scene.position);
```

---

## 9. Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Black screen | No `alpha: true` on renderer | Add `{ alpha: true }` to WebGLRenderer |
| Objects invisible | Camera inside or behind objects | Check `camera.position.z` |
| Particles are squares | Default PointsMaterial | Set `size` and `sizeAttenuation: true` |
| Animation stutters | Too many objects/high segments | Reduce counts, cap pixelRatio |
| BufferGeometry not updating | Missing `needsUpdate` | Set `geometry.attributes.position.needsUpdate = true` |
| Canvas blocks clicks | Canvas catches mouse events | Add `pointer-events: none` to canvas style |
| Memory leak on slide change | Not disposing | Call `geometry.dispose()`, `material.dispose()`, `renderer.dispose()` |
| White flash on load | Renderer default clear color | Set `renderer.setClearColor(0x000000, 0)` |

---

## 10. Advanced Animation Patterns

Beyond simple `rotation.y += 0.01` — these patterns create polished, organic-feeling motion.

### 10.1 Group-Based Hierarchy

Parent transforms propagate to children automatically. Use `THREE.Group` to build
composable rigs where rotating the parent spins all children in world space.

```javascript
// Create a pivot group
const pivot = new THREE.Group();
scene.add(pivot);

// Attach children — they inherit parent transforms
const planet = new THREE.Mesh(
  new THREE.SphereGeometry(0.5, 32, 32),
  new THREE.MeshBasicMaterial({ color: 0x00d4ff })
);
planet.position.x = 4; // Offset from pivot center
pivot.add(planet);

// A moon orbiting the planet — nested hierarchy
const moonPivot = new THREE.Group();
planet.add(moonPivot);
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(0.15, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xffffff })
);
moon.position.x = 1;
moonPivot.add(moon);

function animate() {
  requestAnimationFrame(animate);
  pivot.rotation.y += 0.005;      // Planet orbits center
  moonPivot.rotation.y += 0.02;   // Moon orbits planet
  renderer.render(scene, camera);
}
```

**Key insight:** Moving the group moves everything inside it. This avoids manual trigonometry for orbital paths.

### 10.2 Morph Targets

Morph targets let you blend between different geometry shapes. Define a base
geometry and one or more morph positions, then tween `morphTargetInfluences`.

```javascript
const geometry = new THREE.BoxGeometry(2, 2, 2, 8, 8, 8);

// Create a sphere-shaped morph target from the same vertex count
const spherePositions = new Float32Array(geometry.attributes.position.count * 3);
const sphereGeo = new THREE.SphereGeometry(1.5, 8, 8);
for (let i = 0; i < sphereGeo.attributes.position.count; i++) {
  spherePositions[i * 3]     = sphereGeo.attributes.position.getX(i);
  spherePositions[i * 3 + 1] = sphereGeo.attributes.position.getY(i);
  spherePositions[i * 3 + 2] = sphereGeo.attributes.position.getZ(i);
}
geometry.morphAttributes.position = [
  new THREE.BufferAttribute(spherePositions, 3)
];

const material = new THREE.MeshBasicMaterial({
  color: 0x7c3aed,
  wireframe: true,
  morphTargets: true,
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Blend in the animation loop (0 = box, 1 = sphere)
function animate() {
  requestAnimationFrame(animate);
  mesh.morphTargetInfluences[0] = Math.sin(Date.now() * 0.001) * 0.5 + 0.5;
  renderer.render(scene, camera);
}
```

### 10.3 Procedural Animation Recipes

#### Sin/Cos Combiners for Organic Motion

Layer multiple sine waves at different frequencies for non-repetitive, organic movement:

```javascript
function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;

  // Organic float — layered sin waves at different frequencies
  mesh.position.y = Math.sin(t * 0.7) * 0.5 + Math.sin(t * 1.3) * 0.25;
  mesh.position.x = Math.cos(t * 0.5) * 0.3 + Math.sin(t * 0.9) * 0.15;

  // Gentle tilt
  mesh.rotation.z = Math.sin(t * 0.4) * 0.1;

  renderer.render(scene, camera);
}
```

#### Smooth Damping (Lerp-Based Easing)

```javascript
const target = new THREE.Vector3(0, 2, 0);
const dampingFactor = 0.05; // Lower = smoother, slower

function animate() {
  requestAnimationFrame(animate);
  // Smoothly approach target — never overshoots
  mesh.position.lerp(target, dampingFactor);
  renderer.render(scene, camera);
}

// Change target anywhere in your code — mesh follows smoothly
document.addEventListener('click', () => {
  target.set(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 5
  );
});
```

#### Spring Physics

```javascript
const spring = { position: 0, velocity: 0, target: 3 };
const stiffness = 0.08;  // Pull strength
const damping = 0.85;    // Friction (< 1.0)

function animate() {
  requestAnimationFrame(animate);
  const force = (spring.target - spring.position) * stiffness;
  spring.velocity = (spring.velocity + force) * damping;
  spring.position += spring.velocity;
  mesh.position.y = spring.position;
  renderer.render(scene, camera);
}
```

---

## 11. Shader Recipes

Copy-paste-ready `ShaderMaterial` examples for common presentation effects.

### 11.1 Fresnel / Rim Lighting

Creates a glowing-edge effect — objects appear lit from behind. Classic sci-fi look.

```javascript
const fresnelMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x00d4ff) },
    uFresnelPower: { value: 2.5 },
    uOpacity: { value: 0.9 },
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform float uFresnelPower;
    uniform float uOpacity;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vViewDir), uFresnelPower);
      gl_FragColor = vec4(uColor, fresnel * uOpacity);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});

// Apply to any geometry — spheres and tori work especially well
const sphere = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), fresnelMaterial);
scene.add(sphere);
```

### 11.2 Noise-Based Dissolve Effect

Uses simplex noise to progressively dissolve geometry. Great for transitions.

```javascript
const dissolveMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uProgress: { value: 0.0 },        // 0 = fully visible, 1 = fully dissolved
    uEdgeColor: { value: new THREE.Color(0xff6600) },
    uBaseColor: { value: new THREE.Color(0x1e293b) },
    uEdgeWidth: { value: 0.05 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vPosition;
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    // Simplex noise (Ashima Arts — public domain)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x2_ = x_ * ns.x + ns.yyyy;
      vec4 y2_ = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x2_) - abs(y2_);
      vec4 b0 = vec4(x2_.xy, y2_.xy);
      vec4 b1 = vec4(x2_.zw, y2_.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }

    uniform float uTime;
    uniform float uProgress;
    uniform vec3 uEdgeColor;
    uniform vec3 uBaseColor;
    uniform float uEdgeWidth;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      float noise = snoise(vPosition * 3.0 + uTime * 0.3) * 0.5 + 0.5;
      float edge = smoothstep(uProgress - uEdgeWidth, uProgress, noise);
      if (noise < uProgress) discard;
      vec3 color = mix(uEdgeColor, uBaseColor, edge);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  side: THREE.DoubleSide,
});

// In the animation loop — drive uProgress from 0 to 1 for full dissolve
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  dissolveMaterial.uniforms.uTime.value = clock.getElapsedTime();
  // Example: auto-dissolve over 4 seconds
  // dissolveMaterial.uniforms.uProgress.value = (clock.getElapsedTime() % 4) / 4;
  renderer.render(scene, camera);
}
```

### 11.3 Gradient Color Ramp

Maps a vertical (or UV-based) gradient across geometry — perfect for backgrounds and abstract surfaces.

```javascript
const gradientMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uColorTop: { value: new THREE.Color(0x7c3aed) },
    uColorBottom: { value: new THREE.Color(0x00d4ff) },
    uColorMid: { value: new THREE.Color(0x1e293b) },
    uOpacity: { value: 0.8 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorTop;
    uniform vec3 uColorBottom;
    uniform vec3 uColorMid;
    uniform float uOpacity;
    varying vec2 vUv;
    void main() {
      // Three-stop gradient: bottom → mid → top
      vec3 color = mix(uColorBottom, uColorMid, smoothstep(0.0, 0.5, vUv.y));
      color = mix(color, uColorTop, smoothstep(0.5, 1.0, vUv.y));
      gl_FragColor = vec4(color, uOpacity);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});

// Apply to a full-screen plane for a background gradient
const bgPlane = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), gradientMaterial);
bgPlane.position.z = -5;
scene.add(bgPlane);
```

---

## 12. Post-Processing Effects

Post-processing applies full-screen effects after the scene is rendered. Uses `EffectComposer` from Three.js addons.

### 12.1 EffectComposer Setup (CDN)

```html
<!-- Three.js core -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160/build/three.min.js"></script>

<!-- Post-processing addons -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/shaders/CopyShader.js"></script>

<!-- Individual effect passes (import only what you need) -->
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/BokehPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/FilmPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/shaders/LuminosityHighPassShader.js"></script>
```

```javascript
// Base composer setup — always starts with RenderPass
const composer = new THREE.EffectComposer(renderer);
const renderPass = new THREE.RenderPass(scene, camera);
composer.addPass(renderPass);

// Replace renderer.render(scene, camera) with:
function animate() {
  requestAnimationFrame(animate);
  composer.render(); // Renders scene + all post-processing passes
}
```

### 12.2 Bloom (UnrealBloomPass)

Adds a soft glow to bright areas. The most popular post-processing effect for presentations.

```javascript
const bloomPass = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,   // strength — 0.3-0.8 for subtle, 1.5+ for dramatic
  0.4,   // radius — how far glow spreads (0.1 - 1.0)
  0.85   // threshold — brightness cutoff (0.0 = everything glows, 1.0 = only white)
);
composer.addPass(bloomPass);
```

**Parameter guide:**
| Parameter | Subtle | Medium | Dramatic |
|-----------|--------|--------|----------|
| strength  | 0.3    | 0.8    | 1.5+     |
| radius    | 0.1    | 0.4    | 0.8      |
| threshold | 0.9    | 0.85   | 0.2      |

**Presentation tip:** Use `threshold: 0.85+` so only bright accent elements glow, not the entire scene.

### 12.3 Depth of Field (BokehPass)

Blurs objects that are not at the focal distance — cinematic camera effect.

```javascript
const bokehPass = new THREE.BokehPass(scene, camera, {
  focus: 5.0,      // Distance from camera to sharp focus plane
  aperture: 0.002, // Smaller = more of scene in focus (0.0001 - 0.01)
  maxblur: 0.01,   // Maximum blur amount (0.001 - 0.02)
});
composer.addPass(bokehPass);
```

**Presentation tip:** Set `focus` to match your main content distance. Use sparingly — heavy blur can obscure slide text overlaid on the 3D scene.

### 12.4 Film Grain (FilmPass)

Adds cinematic film grain and optional scanlines.

```javascript
const filmPass = new THREE.FilmPass(
  0.2,   // noise intensity (0.0 - 1.0) — 0.1-0.3 for subtle
  false  // grayscale (true for B&W grain effect)
);
composer.addPass(filmPass);
```

### 12.5 Combining Multiple Passes

Passes execute in order. Each pass receives the output of the previous one.

```javascript
const composer = new THREE.EffectComposer(renderer);

// 1. Always start with the render pass
composer.addPass(new THREE.RenderPass(scene, camera));

// 2. Bloom — adds glow
const bloom = new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6, 0.4, 0.85
);
composer.addPass(bloom);

// 3. Film grain — adds texture
const film = new THREE.FilmPass(0.15, false);
composer.addPass(film);

// In animation loop
function animate() {
  requestAnimationFrame(animate);
  composer.render(); // All passes applied in sequence
}

// Handle resize — composer needs resizing too
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h); // Don't forget this!
});
```

**Performance note:** Each pass adds a full-screen render. Limit to 2-3 passes for presentation backgrounds. Bloom + Film is a great default combo.

---

## 13. Advanced Particle Systems

Scaling from hundreds to tens-of-thousands of particles with GPU instancing and advanced emitter patterns.

### 13.1 GPU Instanced Particles (InstancedMesh)

`InstancedMesh` renders thousands of identical geometries in a single draw call.
Far more performant than creating individual `Mesh` objects.

```javascript
const count = 5000;
const geometry = new THREE.SphereGeometry(0.05, 8, 8);
const material = new THREE.MeshBasicMaterial({ color: 0x00d4ff });

const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
scene.add(instancedMesh);

const dummy = new THREE.Object3D();
for (let i = 0; i < count; i++) {
  dummy.position.set(
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20
  );
  dummy.scale.setScalar(0.5 + Math.random() * 1.5);
  dummy.updateMatrix();
  instancedMesh.setMatrixAt(i, dummy.matrix);
}
instancedMesh.instanceMatrix.needsUpdate = true;
```

### 13.2 Per-Instance Transforms and Colors

Update individual instance transforms each frame, and assign unique colors via `InstancedBufferAttribute`.

```javascript
// Per-instance colors
const colors = new Float32Array(count * 3);
for (let i = 0; i < count; i++) {
  const t = i / count;
  colors[i * 3]     = 0.0;            // R
  colors[i * 3 + 1] = 0.5 + t * 0.3;  // G — gradient across instances
  colors[i * 3 + 2] = 1.0;            // B
}
geometry.setAttribute('color', new THREE.InstancedBufferAttribute(colors, 3));
material.vertexColors = true;

// Animate per-instance transforms
const matrices = [];
const velocities = [];
for (let i = 0; i < count; i++) {
  matrices.push(new THREE.Matrix4());
  velocities.push(new THREE.Vector3(
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02,
    (Math.random() - 0.5) * 0.02
  ));
}

const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  for (let i = 0; i < count; i++) {
    instancedMesh.getMatrixAt(i, matrices[i]);
    matrices[i].decompose(pos, quat, scl);
    pos.add(velocities[i]);

    // Wrap around bounding box
    if (Math.abs(pos.x) > 10) pos.x *= -1;
    if (Math.abs(pos.y) > 10) pos.y *= -1;
    if (Math.abs(pos.z) > 10) pos.z *= -1;

    matrices[i].compose(pos, quat, scl);
    instancedMesh.setMatrixAt(i, matrices[i]);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
  renderer.render(scene, camera);
}
```

### 13.3 Particle Trails

Shift the position history array each frame to create fading comet-like trails.

```javascript
const trailLength = 20;
const particleCount = 50;
const totalPoints = particleCount * trailLength;

const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(totalPoints * 3);
const opacities = new Float32Array(totalPoints);

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
// Custom attribute for per-point opacity
geometry.setAttribute('alpha', new THREE.BufferAttribute(opacities, 1));

// Store head positions and velocities for each particle
const heads = [];
for (let i = 0; i < particleCount; i++) {
  heads.push({
    pos: new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    ),
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.08,
      (Math.random() - 0.5) * 0.08
    ),
  });
}

// Custom shader for per-point opacity
const trailMaterial = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float alpha;
    varying float vAlpha;
    void main() {
      vAlpha = alpha;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 3.0 * (5.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      gl_FragColor = vec4(0.0, 0.83, 1.0, vAlpha);
    }
  `,
  transparent: true,
  depthWrite: false,
});

const points = new THREE.Points(geometry, trailMaterial);
scene.add(points);

function animate() {
  requestAnimationFrame(animate);
  for (let i = 0; i < particleCount; i++) {
    const base = i * trailLength;
    // Shift trail positions backward (oldest point dropped)
    for (let t = trailLength - 1; t > 0; t--) {
      const idx = (base + t) * 3;
      const prev = (base + t - 1) * 3;
      positions[idx]     = positions[prev];
      positions[idx + 1] = positions[prev + 1];
      positions[idx + 2] = positions[prev + 2];
    }
    // Advance head
    heads[i].pos.add(heads[i].vel);
    const headIdx = base * 3;
    positions[headIdx]     = heads[i].pos.x;
    positions[headIdx + 1] = heads[i].pos.y;
    positions[headIdx + 2] = heads[i].pos.z;

    // Set opacity: head = 1.0, tail fades to 0.0
    for (let t = 0; t < trailLength; t++) {
      opacities[base + t] = 1.0 - (t / trailLength);
    }
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.alpha.needsUpdate = true;
  renderer.render(scene, camera);
}
```

### 13.4 Emitter Patterns

Control where particles spawn with different emitter shapes.

```javascript
// -- Point emitter (explosion from center)
function emitPoint(target) {
  target.set(0, 0, 0);
}

// -- Line emitter (along an axis)
function emitLine(target, length) {
  target.set(
    (Math.random() - 0.5) * length,
    0,
    0
  );
}

// -- Ring / Circle emitter
function emitRing(target, radius) {
  const angle = Math.random() * Math.PI * 2;
  target.set(
    Math.cos(angle) * radius,
    0,
    Math.sin(angle) * radius
  );
}

// -- Sphere surface emitter
function emitSphere(target, radius) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  target.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

// -- Box surface emitter
function emitBoxSurface(target, size) {
  const face = Math.floor(Math.random() * 6);
  const u = (Math.random() - 0.5) * size;
  const v = (Math.random() - 0.5) * size;
  const h = size / 2;
  switch (face) {
    case 0: target.set( h, u, v); break;  // +X
    case 1: target.set(-h, u, v); break;  // -X
    case 2: target.set(u,  h, v); break;  // +Y
    case 3: target.set(u, -h, v); break;  // -Y
    case 4: target.set(u, v,  h); break;  // +Z
    case 5: target.set(u, v, -h); break;  // -Z
  }
}

// Usage — initialize particles with an emitter
const positions = geometry.attributes.position.array;
for (let i = 0; i < count; i++) {
  const p = new THREE.Vector3();
  emitSphere(p, 5);  // Swap emitter function as needed
  positions[i * 3]     = p.x;
  positions[i * 3 + 1] = p.y;
  positions[i * 3 + 2] = p.z;
}
geometry.attributes.position.needsUpdate = true;
```

---

## 14. Advanced Animation Techniques

Beyond basic transforms — bone-like hierarchies, morph blending, noise-driven motion, and skeletal chains built entirely from `THREE.Group`.

### 14.1 Group-Based Bone Hierarchy (Armature Pattern)

Use a parent `THREE.Group` as an "armature" root and nested child groups as "bones". Rotations cascade automatically through the hierarchy, enabling skeletal-style animation without `SkinnedMesh` or bone weights.

```javascript
// Armature root
const armature = new THREE.Group();
scene.add(armature);

// Bone 1 — upper segment
const bone1 = new THREE.Group();
bone1.position.set(0, 2, 0);
armature.add(bone1);

const upperSegment = new THREE.Mesh(
  new THREE.BoxGeometry(0.3, 2, 0.3),
  new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true })
);
upperSegment.position.y = 1; // Center mesh along bone axis
bone1.add(upperSegment);

// Bone 2 — middle segment (child of bone1)
const bone2 = new THREE.Group();
bone2.position.set(0, 2, 0); // Tip of bone1
bone1.add(bone2);

const middleSegment = new THREE.Mesh(
  new THREE.BoxGeometry(0.25, 1.5, 0.25),
  new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true })
);
middleSegment.position.y = 0.75;
bone2.add(middleSegment);

// Bone 3 — end effector
const bone3 = new THREE.Group();
bone3.position.set(0, 1.5, 0);
bone2.add(bone3);

const endEffector = new THREE.Mesh(
  new THREE.SphereGeometry(0.2, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0xff6600 })
);
bone3.add(endEffector);

// Animate — rotations propagate through the chain
function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  bone1.rotation.z = Math.sin(t * 0.8) * 0.4;       // Shoulder
  bone2.rotation.z = Math.sin(t * 1.2 + 0.5) * 0.6; // Elbow
  bone3.rotation.z = Math.sin(t * 1.8 + 1.0) * 0.3; // Wrist
  renderer.render(scene, camera);
}
```

**Key insight:** Each bone's rotation is relative to its parent. Rotating `bone1` moves everything downstream automatically. This is the same principle as skeletal animation without the complexity of weight painting.

### 14.2 Morph Targets with BufferGeometry (Multi-Target Blending)

Blend between multiple geometry shapes simultaneously. All morph targets must share the same vertex count as the base geometry.

```javascript
const baseGeo = new THREE.IcosahedronGeometry(2, 4);
const vertexCount = baseGeo.attributes.position.count;

// Morph target 1: spiky — push every Nth vertex outward along its normal
const spikyPositions = new Float32Array(vertexCount * 3);
for (let i = 0; i < vertexCount; i++) {
  const nx = baseGeo.attributes.normal.getX(i);
  const ny = baseGeo.attributes.normal.getY(i);
  const nz = baseGeo.attributes.normal.getZ(i);
  const spike = (i % 3 === 0) ? 1.5 : 0.0;
  spikyPositions[i * 3]     = baseGeo.attributes.position.getX(i) + nx * spike;
  spikyPositions[i * 3 + 1] = baseGeo.attributes.position.getY(i) + ny * spike;
  spikyPositions[i * 3 + 2] = baseGeo.attributes.position.getZ(i) + nz * spike;
}

// Morph target 2: flattened disc — squash Y axis
const flatPositions = new Float32Array(vertexCount * 3);
for (let i = 0; i < vertexCount; i++) {
  flatPositions[i * 3]     = baseGeo.attributes.position.getX(i) * 1.5;
  flatPositions[i * 3 + 1] = baseGeo.attributes.position.getY(i) * 0.1;
  flatPositions[i * 3 + 2] = baseGeo.attributes.position.getZ(i) * 1.5;
}

baseGeo.morphAttributes.position = [
  new THREE.BufferAttribute(spikyPositions, 3),
  new THREE.BufferAttribute(flatPositions, 3),
];

const mesh = new THREE.Mesh(baseGeo, new THREE.MeshBasicMaterial({
  color: 0x00d4ff, wireframe: true, morphTargets: true,
}));
scene.add(mesh);

// Blend between targets — influences are independent and additive
function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;
  mesh.morphTargetInfluences[0] = Math.max(0, Math.sin(t));
  mesh.morphTargetInfluences[1] = Math.max(0, Math.sin(t + Math.PI));
  renderer.render(scene, camera);
}
```

### 14.3 Procedural Animation: Perlin Noise Fields

Use 3D noise to drive non-repeating, organic vertex displacement. For GPU performance, use the GLSL simplex noise from Section 11.2 in a vertex shader. The JS version below is suitable for low-vertex-count geometries.

```javascript
// Simplified value noise for JS-side displacement
function valueNoise3D(x, y, z) {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return (n - Math.floor(n)) * 2.0 - 1.0;
}

const plane = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 15, 80, 80),
  new THREE.MeshBasicMaterial({ color: 0x7c3aed, wireframe: true })
);
plane.rotation.x = -Math.PI / 2.5;
scene.add(plane);

const basePositions = plane.geometry.attributes.position.array.slice();

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.0003;
  const positions = plane.geometry.attributes.position.array;

  for (let i = 0; i < positions.length / 3; i++) {
    const bx = basePositions[i * 3];
    const by = basePositions[i * 3 + 1];
    // Layer octaves for richer motion
    const n1 = valueNoise3D(bx * 0.3 + t, by * 0.3, t * 0.5) * 1.0;
    const n2 = valueNoise3D(bx * 0.6 + t, by * 0.6, t * 0.8) * 0.5;
    const n3 = valueNoise3D(bx * 1.2 + t, by * 1.2, t * 1.2) * 0.25;
    positions[i * 3 + 2] = n1 + n2 + n3;
  }
  plane.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
```

**Performance tip:** For geometries with > 5 000 vertices, move noise to a vertex shader (see Section 15 — Noise-Based Vertex Distortion) to avoid per-frame JS array iteration.

### 14.4 Spring-Damper Systems (Multi-Body)

Extend the single-spring pattern (Section 10.3) to a chain of connected bodies. Each body is pulled toward the one in front of it with spring force and friction damping.

```javascript
const bodies = [];
const count = 8;
const stiffness = 0.06;
const damping = 0.82;

for (let i = 0; i < count; i++) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.2 - i * 0.015, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  scene.add(mesh);
  bodies.push({
    mesh,
    pos: new THREE.Vector3(i * -1.2, 0, 0),
    vel: new THREE.Vector3(),
  });
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;

  // Leader follows a Lissajous curve
  bodies[0].pos.set(Math.sin(t * 0.7) * 4, Math.cos(t * 0.5) * 3, Math.sin(t * 0.3) * 2);

  // Followers spring toward the body in front
  for (let i = 1; i < count; i++) {
    const delta = new THREE.Vector3().subVectors(bodies[i - 1].pos, bodies[i].pos);
    const force = delta.multiplyScalar(stiffness);
    bodies[i].vel.add(force);
    bodies[i].vel.multiplyScalar(damping);
    bodies[i].pos.add(bodies[i].vel);
  }

  // Apply positions to meshes
  for (const body of bodies) {
    body.mesh.position.copy(body.pos);
  }
  renderer.render(scene, camera);
}
```

### 14.5 Skeletal Chain Animation Without Skinned Meshes

A tentacle / rope / cable built from nested groups. Each segment follows its parent with rotational damping — no `SkinnedMesh` required.

```javascript
const segmentCount = 12;
const segmentLength = 0.8;
const chain = [];

for (let i = 0; i < segmentCount; i++) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      0.08 - i * 0.005,
      0.08 - (i + 1) * 0.005,
      segmentLength, 8
    ),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true })
  );
  mesh.position.y = segmentLength / 2;
  group.add(mesh);

  if (i === 0) {
    scene.add(group);
    group.position.set(0, 3, 0);
  } else {
    chain[i - 1].group.add(group);
    group.position.y = -segmentLength;
  }

  chain.push({ group, targetRotZ: 0, currentRotZ: 0 });
}

function animate() {
  requestAnimationFrame(animate);
  const t = performance.now() * 0.001;

  // Drive root with a wave
  chain[0].targetRotZ = Math.sin(t * 1.5) * 0.3;

  // Propagate with damping — each segment lags behind the previous
  for (let i = 0; i < segmentCount; i++) {
    if (i > 0) {
      chain[i].targetRotZ = chain[i - 1].currentRotZ * 0.85;
    }
    chain[i].currentRotZ += (chain[i].targetRotZ - chain[i].currentRotZ) * 0.1;
    chain[i].group.rotation.z = chain[i].currentRotZ;
  }

  renderer.render(scene, camera);
}
```

**Presentation use:** Decorative tentacles, swaying cables, organic connectors between network nodes.

---

## 15. Shader Recipes II

Additional copy-paste-ready `ShaderMaterial` blocks for effects not covered in Section 11.

### 15.1 Noise-Based Vertex Distortion

Displaces vertices along their normals using simplex noise — creates organic, blobby, evolving surfaces.

```javascript
const distortMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uAmplitude: { value: 0.4 },
    uFrequency: { value: 1.5 },
    uColor: { value: new THREE.Color(0x00d4ff) },
  },
  vertexShader: `
    // --- Inline simplex noise (Ashima Arts) ---
    vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
    vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1.0/6.0,1.0/3.0);
      const vec4 D=vec4(0.0,0.5,1.0,2.0);
      vec3 i=floor(v+dot(v,C.yyy));
      vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz);
      vec3 l=1.0-g;
      vec3 i1=min(g.xyz,l.zxy);
      vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx;
      vec3 x2=x0-i2+C.yyy;
      vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(
        i.z+vec4(0.0,i1.z,i2.z,1.0))
        +i.y+vec4(0.0,i1.y,i2.y,1.0))
        +i.x+vec4(0.0,i1.x,i2.x,1.0));
      float n_=0.142857142857;
      vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.0*floor(p*ns.z*ns.z);
      vec4 x_=floor(j*ns.z);
      vec4 y_=floor(j-7.0*x_);
      vec4 x2_=x_*ns.x+ns.yyyy;
      vec4 y2_=y_*ns.x+ns.yyyy;
      vec4 h=1.0-abs(x2_)-abs(y2_);
      vec4 b0=vec4(x2_.xy,y2_.xy);
      vec4 b1=vec4(x2_.zw,y2_.zw);
      vec4 s0=floor(b0)*2.0+1.0;
      vec4 s1=floor(b1)*2.0+1.0;
      vec4 sh=-step(h,vec4(0.0));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
      vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x);
      vec3 p1=vec3(a0.zw,h.y);
      vec3 p2=vec3(a1.xy,h.z);
      vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
      vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
      m=m*m;
      return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    // --- End noise ---

    uniform float uTime;
    uniform float uAmplitude;
    uniform float uFrequency;
    varying vec2 vUv;
    varying float vDisplacement;

    void main() {
      vUv = uv;
      float disp = snoise(position * uFrequency + uTime * 0.5) * uAmplitude;
      vDisplacement = disp;
      vec3 newPos = position + normal * disp;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying vec2 vUv;
    varying float vDisplacement;
    void main() {
      vec3 color = uColor + vDisplacement * 0.5;
      float alpha = 0.7 + vDisplacement * 0.3;
      gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0));
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});

// Best on high-subdivision spheres
const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(2, 5), distortMaterial);
scene.add(blob);
```

### 15.2 Hologram / Scan-Line Effect

Horizontal scan lines + fresnel rim + flicker for a sci-fi holographic look.

```javascript
const hologramMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
    uScanLines: { value: 60.0 },
    uFlickerSpeed: { value: 8.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uScanLines;
    uniform float uFlickerSpeed;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vViewDir), 2.0);
      float scanLine = pow(sin(vUv.y * uScanLines * 3.14159) * 0.5 + 0.5, 1.5);
      float flicker = sin(uTime * uFlickerSpeed) * 0.1 + 0.9;
      float alpha = (fresnel * 0.6 + 0.2) * scanLine * flicker;
      gl_FragColor = vec4(uColor, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});
// Works on any geometry — characters, text meshes, logos
```

### 15.3 Energy Shield / Force Field

Animated ripple effect originating from a configurable hit point. Set `uHitIntensity` to `1.0` on impact, then decay it back to `0.0`.

```javascript
const shieldMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
    uHitPoint: { value: new THREE.Vector3(0, 0, 1) },
    uHitIntensity: { value: 0.0 },
  },
  vertexShader: `
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
      vViewDir = normalize(cameraPosition - worldPos.xyz);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uHitPoint;
    uniform float uHitIntensity;
    varying vec3 vWorldPos;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vViewDir)), 3.0);
      float hitDist = distance(vWorldPos, uHitPoint);
      float ripple = sin(hitDist * 15.0 - uTime * 8.0) * 0.5 + 0.5;
      ripple *= exp(-hitDist * 2.0) * uHitIntensity;
      float alpha = fresnel * 0.4 + ripple * 0.8;
      vec3 color = uColor + vec3(ripple * 0.3);
      gl_FragColor = vec4(color, alpha);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
});
// Apply to a SphereGeometry(3, 64, 64) for a force-field bubble
```

### 15.4 Animated Gradient with Color Cycling

Three-color gradient that slowly rotates its color stops over time.

```javascript
const cycleGradientMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColorA: { value: new THREE.Color(0x00d4ff) },
    uColorB: { value: new THREE.Color(0x7c3aed) },
    uColorC: { value: new THREE.Color(0xff6600) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    varying vec2 vUv;
    void main() {
      float shift = uTime * 0.15;
      float t = fract(vUv.y + shift);
      vec3 color = mix(uColorA, uColorB, smoothstep(0.0, 0.5, t));
      color = mix(color, uColorC, smoothstep(0.5, 1.0, t));
      gl_FragColor = vec4(color, 0.85);
    }
  `,
  transparent: true,
  side: THREE.DoubleSide,
});
```

---

## 16. Post-Processing Pipeline II

Extended techniques beyond the basics in Section 12 — custom shader passes, selective bloom, and outline effects.

### 16.1 Custom ShaderPass

Create your own full-screen post-processing effect using `ShaderPass`.

```javascript
// CDN import (in addition to Section 12.1 imports)
// <script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/ShaderPass.js"></script>

const vignetteShader = {
  uniforms: {
    tDiffuse: { value: null },   // Automatically fed by EffectComposer
    uDarkness: { value: 1.5 },
    uOffset: { value: 1.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(0.5, 0.5 - uOffset * 0.5, dist * (uDarkness + uOffset));
      texel.rgb *= vignette;
      gl_FragColor = texel;
    }
  `,
};

const vignettePass = new THREE.ShaderPass(vignetteShader);
composer.addPass(vignettePass);
```

**Pattern:** Any custom shader pass must declare a `tDiffuse` uniform — the composer pipes the previous pass's output into it automatically.

### 16.2 Selective Bloom (Bloom Layer Technique)

Apply bloom only to specific objects by rendering them on a separate layer and compositing.

```javascript
const BLOOM_LAYER = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_LAYER);

// Tag objects that should glow
glowingMesh.layers.enable(BLOOM_LAYER);

// Dark material to hide non-bloomed objects during bloom pass
const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const storedMaterials = {};

function darkenNonBloomed(obj) {
  if (obj.isMesh && !bloomLayer.test(obj.layers)) {
    storedMaterials[obj.uuid] = obj.material;
    obj.material = darkMaterial;
  }
}

function restoreMaterials(obj) {
  if (storedMaterials[obj.uuid]) {
    obj.material = storedMaterials[obj.uuid];
    delete storedMaterials[obj.uuid];
  }
}

// Bloom composer — renders only glowing objects
const bloomComposer = new THREE.EffectComposer(renderer);
bloomComposer.renderToScreen = false;
bloomComposer.addPass(new THREE.RenderPass(scene, camera));
bloomComposer.addPass(new THREE.UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5, 0.4, 0.1
));

// Final composer — blends bloom texture with the full scene
const finalComposer = new THREE.EffectComposer(renderer);
finalComposer.addPass(new THREE.RenderPass(scene, camera));

// Custom additive blend pass
const blendPass = new THREE.ShaderPass(
  new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tBloom: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tBloom;
      varying vec2 vUv;
      void main() {
        gl_FragColor = texture2D(tDiffuse, vUv) + texture2D(tBloom, vUv);
      }
    `,
  }),
  'tDiffuse'
);
finalComposer.addPass(blendPass);

function animate() {
  requestAnimationFrame(animate);
  // 1. Darken non-bloom objects, render bloom pass
  scene.traverse(darkenNonBloomed);
  bloomComposer.render();
  scene.traverse(restoreMaterials);
  // 2. Render final composite
  finalComposer.render();
}
```

### 16.3 GlitchPass for Transitions

Adds a digital glitch effect — great for slide transitions or cyberpunk themes.

```html
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/postprocessing/GlitchPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.160/examples/js/shaders/DigitalGlitch.js"></script>
```

```javascript
const glitchPass = new THREE.GlitchPass();
glitchPass.goWild = false; // true = constant intense glitch
composer.addPass(glitchPass);

// Trigger a short glitch burst (e.g., on slide change)
function triggerGlitch(durationMs = 500) {
  glitchPass.enabled = true;
  glitchPass.goWild = true;
  setTimeout(() => {
    glitchPass.goWild = false;
    glitchPass.enabled = false;
  }, durationMs);
}
```

### 16.4 Performance Budget for Post-Processing

| Passes | GPU Cost | Recommendation |
|--------|----------|----------------|
| 1 (RenderPass only) | Baseline | Always needed |
| 2 (+ Bloom) | ~1.5x | Safe default for presentations |
| 3 (+ Bloom + Film) | ~2x | Good for high-end devices |
| 4+ | 2.5x+ | Avoid for presentation backgrounds |

**Rule of thumb:** Limit to 2-3 effect passes for presentation backgrounds. Test at 1920x1080 on integrated GPUs — that is your audience's worst case.

---

## 17. Advanced Particle Systems II

Force fields, GPU-driven animation, and techniques for scaling to 50k+ particles.

### 17.1 Force Fields (Attractors & Repulsors)

Apply distance-based acceleration to particles. Attractors pull particles inward; repulsors push them away.

```javascript
const attractors = [
  { pos: new THREE.Vector3(3, 0, 0), strength: 2.0 },
  { pos: new THREE.Vector3(-3, 2, 0), strength: -1.5 }, // Negative = repulsor
];

const count = 2000;
const positions = new Float32Array(count * 3);
const velocities = [];

for (let i = 0; i < count; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 20;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  velocities.push(new THREE.Vector3());
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const points = new THREE.Points(geometry, new THREE.PointsMaterial({
  color: 0x00d4ff, size: 0.06, transparent: true, opacity: 0.8, sizeAttenuation: true,
}));
scene.add(points);

const particlePos = new THREE.Vector3();
const forceDir = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  for (let i = 0; i < count; i++) {
    particlePos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);

    // Accumulate forces from all attractors/repulsors
    for (const attractor of attractors) {
      forceDir.subVectors(attractor.pos, particlePos);
      const dist = Math.max(forceDir.length(), 0.5); // Clamp to avoid singularity
      forceDir.normalize();
      const forceMag = attractor.strength / (dist * dist); // Inverse-square falloff
      velocities[i].addScaledVector(forceDir, forceMag * 0.01);
    }

    // Friction
    velocities[i].multiplyScalar(0.98);

    // Integrate
    positions[i * 3]     += velocities[i].x;
    positions[i * 3 + 1] += velocities[i].y;
    positions[i * 3 + 2] += velocities[i].z;
  }

  geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}
```

**Presentation use:** Orbit attractors slowly around the scene center for mesmerizing swirling particle clouds. Combine one attractor + one repulsor for vortex-like motion.

### 17.2 GPU Particle Animation (Custom Vertex Shader)

Move particle animation entirely to the GPU. Encode per-particle seed data in custom attributes; compute position in the vertex shader. The CPU never touches positions after initialization.

```javascript
const count = 50000;
const seeds = new Float32Array(count * 4); // x, y, z seed + speed
for (let i = 0; i < count; i++) {
  seeds[i * 4]     = (Math.random() - 0.5) * 20; // Origin X
  seeds[i * 4 + 1] = (Math.random() - 0.5) * 20; // Origin Y
  seeds[i * 4 + 2] = (Math.random() - 0.5) * 20; // Origin Z
  seeds[i * 4 + 3] = 0.5 + Math.random() * 1.5;  // Speed multiplier
}

const geometry = new THREE.BufferGeometry();
// Dummy positions — vertex shader overrides them
geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

const gpuParticleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x00d4ff) },
    uAmplitude: { value: 2.0 },
  },
  vertexShader: `
    attribute vec4 aSeed;
    uniform float uTime;
    uniform float uAmplitude;
    varying float vAlpha;

    void main() {
      float t = uTime * aSeed.w; // Per-particle time offset by speed
      vec3 pos = aSeed.xyz;

      // Orbital motion: each particle orbits its origin
      pos.x += sin(t * 0.7 + aSeed.x) * uAmplitude;
      pos.y += cos(t * 0.5 + aSeed.y) * uAmplitude;
      pos.z += sin(t * 0.3 + aSeed.z) * uAmplitude * 0.5;

      // Fade based on distance from center
      vAlpha = 1.0 - smoothstep(5.0, 12.0, length(pos));

      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = 2.0 * (8.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;
    void main() {
      // Soft circle shape
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float softEdge = 1.0 - smoothstep(0.3, 0.5, d);
      gl_FragColor = vec4(uColor, vAlpha * softEdge);
    }
  `,
  transparent: true,
  depthWrite: false,
});

const particles = new THREE.Points(geometry, gpuParticleMaterial);
scene.add(particles);

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  gpuParticleMaterial.uniforms.uTime.value = clock.getElapsedTime();
  renderer.render(scene, camera);
}
```

**Performance:** 50 000 particles at 60 fps is easily achievable because the CPU does zero per-particle work. The vertex shader handles all position computation.

### 17.3 Particle Ring Buffer (Efficient Trail Pooling)

Instead of shifting arrays (O(n) per frame, Section 13.3), use a ring buffer with a write pointer for O(1) trail updates.

```javascript
const trailLength = 30;
const emitterCount = 100;
const totalPoints = emitterCount * trailLength;

const positions = new Float32Array(totalPoints * 3);
const alphas = new Float32Array(totalPoints);
const writePointers = new Int32Array(emitterCount).fill(0);

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

// Each emitter has a head position
const heads = Array.from({ length: emitterCount }, () => ({
  pos: new THREE.Vector3(
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10,
    (Math.random() - 0.5) * 10
  ),
  vel: new THREE.Vector3(
    (Math.random() - 0.5) * 0.06,
    (Math.random() - 0.5) * 0.06,
    (Math.random() - 0.5) * 0.06
  ),
}));

function animate() {
  requestAnimationFrame(animate);

  for (let e = 0; e < emitterCount; e++) {
    const head = heads[e];
    head.pos.add(head.vel);

    // Write new head position at the ring buffer pointer
    const base = e * trailLength;
    const wp = writePointers[e];
    const idx = (base + wp) * 3;
    positions[idx]     = head.pos.x;
    positions[idx + 1] = head.pos.y;
    positions[idx + 2] = head.pos.z;

    // Update opacity: newest = 1.0, oldest = 0.0
    for (let t = 0; t < trailLength; t++) {
      const age = (trailLength + wp - t) % trailLength;
      alphas[base + t] = 1.0 - age / trailLength;
    }

    // Advance write pointer (ring buffer wraps)
    writePointers[e] = (wp + 1) % trailLength;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.alpha.needsUpdate = true;
  renderer.render(scene, camera);
}
```

**Why ring buffer?** Shifting arrays copies `trailLength` floats per emitter per frame. A ring buffer writes exactly 3 floats per emitter per frame — orders of magnitude faster at scale.
