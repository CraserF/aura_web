/**
 * RevealJS Three.js Backgrounds Plugin (TypeScript Port)
 * =======================================================
 * Drop-in plugin that adds 3D animated backgrounds to reveal.js slides.
 * Three.js is LAZY LOADED via dynamic import -- it is not a static dependency.
 *
 * Usage:
 *   Add data attributes to slides:
 *     <section data-three-bg="particles">
 *     <section data-three-bg="globe">
 *     <section data-three-bg="waves">
 *     <section data-three-bg="wormhole">
 *     <section data-three-bg="mesh">
 *     <section data-three-bg="neural">
 *
 * Configuration (via data attributes on <section>):
 *   data-three-bg="sceneName"          -- Required. Scene type.
 *   data-three-color="#00d4ff"          -- Primary color (hex).
 *   data-three-color2="#7c3aed"         -- Secondary color (hex).
 *   data-three-speed="1"               -- Animation speed multiplier.
 *   data-three-density="1"             -- Particle/element density multiplier.
 *   data-three-opacity="0.6"           -- Background opacity (0-1).
 */

interface ThreeSceneConfig {
  scene: string | null;
  color: string;
  color2: string;
  speed: number;
  density: number;
  opacity: number;
}

interface ThreeSceneHandle {
  start: () => void;
  stop: () => void;
  resize: () => void;
  dispose: () => void;
}

type UpdateFn = (delta: number, elapsed: number) => void;

export const ThreeBackgroundPlugin = {
  id: 'three-background',

  init(deck: any): void {
    const canvases = new Map<HTMLElement, ThreeSceneHandle>();
    let activeScene: ThreeSceneHandle | null = null;

    // --- Utility ---
    function getConfig(section: HTMLElement): ThreeSceneConfig {
      return {
        scene: section.getAttribute('data-three-bg'),
        color: section.getAttribute('data-three-color') || '#00d4ff',
        color2: section.getAttribute('data-three-color2') || '#7c3aed',
        speed: parseFloat(section.getAttribute('data-three-speed') || '1'),
        density: parseFloat(section.getAttribute('data-three-density') || '1'),
        opacity: parseFloat(section.getAttribute('data-three-opacity') || '0.6'),
      };
    }

    // --- Scene Factory (async -- lazily imports Three.js) ---
    async function createScene(
      container: HTMLElement,
      config: ThreeSceneConfig,
    ): Promise<ThreeSceneHandle | null> {
      let THREE: any;
      try {
        // Dynamic import with variable name to prevent Rollup from resolving the specifier.
        // three.js is an optional peer dependency loaded at runtime.
        const mod = 'three';
        THREE = await (Function('m', 'return import(m)') as (m: string) => Promise<any>)(mod);
      } catch {
        console.warn(
          '[ThreeBackgroundPlugin] Three.js could not be loaded. ' +
            'Install it with `npm install three` to enable 3D backgrounds.',
        );
        return null;
      }

      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.domElement.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;';
      container.insertBefore(renderer.domElement, container.firstChild);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
      camera.position.z = 5;

      const clock = new THREE.Clock();
      let animId: number | null = null;
      let updateFn: UpdateFn | null = null;

      // Build the specific scene
      switch (config.scene) {
        case 'particles':
          updateFn = buildParticles(THREE, scene, camera, config);
          break;
        case 'globe':
          updateFn = buildGlobe(THREE, scene, camera, config);
          break;
        case 'waves':
          updateFn = buildWaves(THREE, scene, camera, config);
          break;
        case 'wormhole':
          updateFn = buildWormhole(THREE, scene, camera, config);
          break;
        case 'mesh':
          updateFn = buildMesh(THREE, scene, camera, config);
          break;
        case 'neural':
          updateFn = buildNeural(THREE, scene, camera, config);
          break;
        default:
          console.warn(`[ThreeBackgroundPlugin] Unknown scene: "${config.scene}"`);
          return null;
      }

      renderer.domElement.style.opacity = String(config.opacity);

      function animate(): void {
        animId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();
        if (updateFn) updateFn(delta, elapsed);
        renderer.render(scene, camera);
      }

      function start(): void {
        clock.start();
        animate();
      }

      function stop(): void {
        if (animId !== null) cancelAnimationFrame(animId);
        animId = null;
      }

      function resize(): void {
        const w = container.clientWidth || window.innerWidth;
        const h = container.clientHeight || window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      }

      function dispose(): void {
        stop();
        scene.traverse((obj: any) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach((m: any) => m.dispose());
            else obj.material.dispose();
          }
        });
        renderer.dispose();
        if (renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      return { start, stop, resize, dispose };
    }

    // ============================
    // Scene Builders
    // ============================

    /**
     * Particles -- floating points with gentle drift
     */
    function buildParticles(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const count = Math.floor(800 * config.density);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const velocities = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 20;
        velocities[i * 3] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: new THREE.Color(config.color),
        size: 0.05,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      camera.position.z = 8;

      return function update(_delta: number, _elapsed: number): void {
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < count; i++) {
          pos[i * 3] += (velocities[i * 3] ?? 0) * config.speed;
          pos[i * 3 + 1] += (velocities[i * 3 + 1] ?? 0) * config.speed;
          pos[i * 3 + 2] += (velocities[i * 3 + 2] ?? 0) * config.speed;

          // Wrap around
          for (let j = 0; j < 3; j++) {
            if (pos[i * 3 + j] > 10) pos[i * 3 + j] = -10;
            if (pos[i * 3 + j] < -10) pos[i * 3 + j] = 10;
          }
        }
        geometry.attributes.position.needsUpdate = true;

        points.rotation.y += 0.0003 * config.speed;
        points.rotation.x += 0.0001 * config.speed;
      };
    }

    /**
     * Globe -- wireframe sphere with latitude/longitude lines
     */
    function buildGlobe(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const sphereGeom = new THREE.SphereGeometry(2, 32, 32);
      const wireframeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      });
      const sphere = new THREE.Mesh(sphereGeom, wireframeMat);
      scene.add(sphere);

      // Add axis rings
      const ringGeom = new THREE.RingGeometry(2.05, 2.1, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color2),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5,
      });

      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(ringGeom, ringMat);
        ring.rotation.x = (Math.PI / 3) * i;
        ring.rotation.y = (Math.PI / 4) * i;
        scene.add(ring);
      }

      // Scatter some dots on the surface
      const dotCount = Math.floor(100 * config.density);
      const dotGeom = new THREE.BufferGeometry();
      const dotPositions = new Float32Array(dotCount * 3);
      for (let i = 0; i < dotCount; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = 2.02;
        dotPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        dotPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        dotPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      dotGeom.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
      const dotMat = new THREE.PointsMaterial({
        color: new THREE.Color(config.color2),
        size: 0.06,
        transparent: true,
        opacity: 0.8,
      });
      const dots = new THREE.Points(dotGeom, dotMat);
      scene.add(dots);

      camera.position.z = 5;

      return function update(_delta: number, _elapsed: number): void {
        sphere.rotation.y += 0.002 * config.speed;
        dots.rotation.y += 0.002 * config.speed;
      };
    }

    /**
     * Waves -- undulating plane surface
     */
    function buildWaves(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const segments = Math.floor(60 * Math.sqrt(config.density));
      const geometry = new THREE.PlaneGeometry(20, 20, segments, segments);
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });

      const plane = new THREE.Mesh(geometry, material);
      plane.rotation.x = -Math.PI / 2.5;
      scene.add(plane);

      camera.position.set(0, 5, 8);
      camera.lookAt(0, 0, 0);

      const basePositions = new Float32Array(geometry.attributes.position.array);

      return function update(_delta: number, elapsed: number): void {
        const pos = geometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
          const x = basePositions[i] ?? 0;
          const y = basePositions[i + 1] ?? 0;
          pos[i + 2] =
            Math.sin(x * 0.5 + elapsed * config.speed) * 0.5 +
            Math.sin(y * 0.3 + elapsed * config.speed * 0.7) * 0.3;
        }
        geometry.attributes.position.needsUpdate = true;
      };
    }

    /**
     * Wormhole -- tunnel of rings rushing toward the camera
     */
    function buildWormhole(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const ringCount = Math.floor(30 * config.density);
      const rings: any[] = [];
      const ringGeom = new THREE.TorusGeometry(2, 0.02, 8, 64);

      for (let i = 0; i < ringCount; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(i % 2 === 0 ? config.color : config.color2),
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeom, mat);
        ring.position.z = -i * 2;
        ring.scale.setScalar(1 + Math.sin(i * 0.3) * 0.3);
        rings.push(ring);
        scene.add(ring);
      }

      camera.position.z = 3;

      return function update(delta: number, _elapsed: number): void {
        for (let i = 0; i < rings.length; i++) {
          rings[i].position.z += 3 * delta * config.speed;
          rings[i].rotation.z += 0.01 * config.speed;

          if (rings[i].position.z > 5) {
            rings[i].position.z = -ringCount * 2 + 5;
          }

          // Fade near camera
          const dist = rings[i].position.z;
          rings[i].material.opacity = dist < 0 ? 0.6 : Math.max(0, 0.6 - dist * 0.15);
        }
      };
    }

    /**
     * Mesh -- connected node network
     */
    function buildMesh(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const nodeCount = Math.floor(50 * config.density);
      const connectionDist = 3;

      // Create nodes
      const nodeGeom = new THREE.SphereGeometry(0.05, 8, 8);
      const nodeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(config.color) });
      const nodes: any[] = [];

      for (let i = 0; i < nodeCount; i++) {
        const mesh = new THREE.Mesh(nodeGeom, nodeMat);
        mesh.position.set(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6,
        );
        mesh.userData.velocity = new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
        );
        nodes.push(mesh);
        scene.add(mesh);
      }

      // Lines for connections
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(config.color2),
        transparent: true,
        opacity: 0.15,
      });

      let lines: any[] = [];

      function updateConnections(): void {
        // Remove old lines
        lines.forEach((l: any) => {
          scene.remove(l);
          l.geometry.dispose();
        });
        lines = [];

        // Build new connections
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dist = nodes[i].position.distanceTo(nodes[j].position);
            if (dist < connectionDist) {
              const geom = new THREE.BufferGeometry().setFromPoints([
                nodes[i].position.clone(),
                nodes[j].position.clone(),
              ]);
              const line = new THREE.Line(geom, lineMat);
              lines.push(line);
              scene.add(line);
            }
          }
        }
      }

      camera.position.z = 8;
      let connectionTimer = 0;

      return function update(delta: number, _elapsed: number): void {
        for (const node of nodes) {
          node.position.add(node.userData.velocity.clone().multiplyScalar(config.speed));

          // Bounds
          const axes = ['x', 'y', 'z'] as const;
          const limits = [6, 4, 3] as const;
          axes.forEach((axis, idx) => {
            if (Math.abs(node.position[axis]) > (limits[idx] ?? 0)) {
              node.userData.velocity[axis] *= -1;
            }
          });
        }

        connectionTimer += delta;
        if (connectionTimer > 0.25) {
          connectionTimer = 0;
          updateConnections();
        }
      };
    }

    /**
     * Neural -- neural network visualization with layers
     */
    function buildNeural(
      THREE: any,
      scene: any,
      camera: any,
      config: ThreeSceneConfig,
    ): UpdateFn {
      const layers = [4, 6, 8, 6, 4];
      const layerSpacing = 2.5;
      const nodeSpacing = 1.2;
      const allNodes: any[][] = [];

      const nodeGeom = new THREE.SphereGeometry(0.1, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.9,
      });

      const edgeMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(config.color2),
        transparent: true,
        opacity: 0.1,
      });

      // Create nodes per layer
      layers.forEach((count, layerIdx) => {
        const layerNodes: any[] = [];
        const xOffset = (layerIdx - (layers.length - 1) / 2) * layerSpacing;

        for (let i = 0; i < count; i++) {
          const yOffset = (i - (count - 1) / 2) * nodeSpacing;
          const node = new THREE.Mesh(nodeGeom, nodeMat.clone());
          node.position.set(xOffset, yOffset, 0);
          node.userData.baseY = yOffset;
          node.userData.layer = layerIdx;
          node.userData.index = i;
          scene.add(node);
          layerNodes.push(node);
        }
        allNodes.push(layerNodes);
      });

      // Create edges between consecutive layers
      for (let l = 0; l < allNodes.length - 1; l++) {
        const currentLayer = allNodes[l];
        const nextLayer = allNodes[l + 1];
        if (!currentLayer || !nextLayer) continue;
        for (const nodeA of currentLayer) {
          for (const nodeB of nextLayer) {
            const geom = new THREE.BufferGeometry().setFromPoints([
              nodeA.position.clone(),
              nodeB.position.clone(),
            ]);
            const line = new THREE.Line(geom, edgeMat);
            scene.add(line);
          }
        }
      }

      camera.position.z = 10;

      // Pulse animation -- light travels through the network
      let pulseLayer = 0;
      let pulseTimer = 0;

      return function update(delta: number, elapsed: number): void {
        pulseTimer += delta * config.speed;

        // Gentle float
        for (const layer of allNodes) {
          for (const node of layer) {
            node.position.y =
              node.userData.baseY +
              Math.sin(elapsed * 0.5 + node.userData.index * 0.5) * 0.1;
          }
        }

        // Pulse through layers
        if (pulseTimer > 0.5) {
          pulseTimer = 0;
          // Reset previous
          const prevLayer = allNodes[pulseLayer];
          if (prevLayer) {
            for (const node of prevLayer) {
              node.material.opacity = 0.9;
              node.scale.setScalar(1);
            }
          }

          pulseLayer = (pulseLayer + 1) % allNodes.length;

          // Highlight current
          const currentLayer = allNodes[pulseLayer];
          if (currentLayer) {
            for (const node of currentLayer) {
              node.material.opacity = 1;
              node.scale.setScalar(1.5);
            }
          }
        }
      };
    }

    // ============================
    // Reveal.js Integration
    // ============================

    // Find all slides with data-three-bg
    async function setupSlides(): Promise<void> {
      const slides: HTMLElement[] = deck.getSlides();
      const setupPromises: Promise<void>[] = [];

      for (const section of slides) {
        const sceneName = section.getAttribute('data-three-bg');
        if (!sceneName) continue;

        // Make sure the section is positioned for absolute children
        const computed = window.getComputedStyle(section);
        if (computed.position === 'static') {
          section.style.position = 'relative';
        }

        const config = getConfig(section);
        const promise = createScene(section, config).then((threeScene) => {
          if (threeScene) {
            canvases.set(section, threeScene);
          }
        });
        setupPromises.push(promise);
      }

      await Promise.all(setupPromises);
    }

    function onSlideChanged(event: { currentSlide?: HTMLElement }): void {
      // Stop previous
      if (activeScene) {
        activeScene.stop();
        activeScene = null;
      }

      // Start current
      const current = event.currentSlide;
      if (current && canvases.has(current)) {
        activeScene = canvases.get(current)!;
        activeScene.resize();
        activeScene.start();
      }
    }

    // Init -- run setup asynchronously
    setupSlides().then(() => {
      // Start the first one if applicable
      const currentSlide: HTMLElement | undefined = deck.getCurrentSlide();
      if (currentSlide && canvases.has(currentSlide)) {
        activeScene = canvases.get(currentSlide)!;
        activeScene.start();
      }
    });

    deck.on('slidechanged', onSlideChanged);

    window.addEventListener('resize', () => {
      canvases.forEach((s) => s.resize());
    });

    // Cleanup on destroy
    deck.on('destroy', () => {
      canvases.forEach((s) => s.dispose());
      canvases.clear();
    });
  },
};
