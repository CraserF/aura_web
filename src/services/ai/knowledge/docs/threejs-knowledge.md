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
