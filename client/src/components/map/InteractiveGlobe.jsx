import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Building2, MousePointer2, RotateCcw, ZoomIn } from 'lucide-react';

const EARTH_RADIUS = 2.2;
const DEFAULT_DISTANCE = 7.25;
const MIN_DISTANCE = 4.85;
const MAX_DISTANCE = 9.1;

const STATION_POINTS = [
  { id: 'MAITRI', name: 'Maitri', lat: -70.77, lon: 11.73, color: '#fb4565', accent: 'rose', coordinates: '70.77°S, 11.73°E' },
  { id: 'BHARATI', name: 'Bharati', lat: -69.23, lon: 76.12, color: '#25e0ba', accent: 'emerald', coordinates: '69.23°S, 76.12°E' }
];

const INDIA = { lat: 15.4909, lon: 73.8278 };

function latLngToVector3(lat, lng, radius = EARTH_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function makeLowDetailTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
  ocean.addColorStop(0, '#0a2b48');
  ocean.addColorStop(0.5, '#07305a');
  ocean.addColorStop(1, '#b5d7e8');
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // A deliberately subdued low-detail map while the full texture is loading.
  ctx.fillStyle = 'rgba(72, 118, 83, 0.9)';
  [[115, 95, 125, 140], [300, 130, 95, 110], [465, 90, 175, 128], [690, 160, 115, 100], [820, 220, 110, 70]].forEach(([x, y, w, h]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, -0.22, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = '#d8edf3';
  ctx.beginPath();
  ctx.ellipse(510, 477, 250, 55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(113, 214, 255, 0.22)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function canRenderWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

function GlobeFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-label="Antarctica overview map">
      <img
        src="/assets/antarctica_polar.jpg"
        alt="Antarctica polar satellite overview"
        className="h-[94%] w-[94%] max-w-[1180px] object-contain opacity-90 map-artwork"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_50%,transparent_0%,rgba(5,11,20,0.12)_35%,#050b14_78%)]" />
    </div>
  );
}

function FallbackStationMarkers({ onStationSelect }) {
  return (
    <div className="absolute inset-0 z-[2]" aria-label="Station shortcuts">
      <button type="button" onClick={() => onStationSelect?.('MAITRI')} className="absolute left-[57%] top-[16%] rounded-md border border-rose-400/80 bg-slate-950/85 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-rose-200 shadow-lg">● MAITRI</button>
      <button type="button" onClick={() => onStationSelect?.('BHARATI')} className="absolute left-[73%] top-[49%] rounded-md border border-emerald-400/80 bg-slate-950/85 px-3 py-1 font-mono text-[10px] font-bold tracking-wider text-emerald-100 shadow-lg">● BHARATI</button>
    </div>
  );
}

/**
 * Three.js globe with screen-space station controls. The controls are HTML for
 * accessibility, but their position is recalculated from the actual 3D point
 * on every animation frame.
 */
export default function InteractiveGlobe({ onStationSelect, stationMetrics = {} }) {
  const mountRef = useRef(null);
  const labelRefs = useRef({});
  const indiaRef = useRef(null);
  const linkRefs = useRef({});
  const animationRef = useRef();
  const onSelectRef = useRef(onStationSelect);
  const [webglAvailable, setWebglAvailable] = useState(null);
  const [zoomTier, setZoomTier] = useState('far');
  const [closeStation, setCloseStation] = useState(null);

  useEffect(() => { onSelectRef.current = onStationSelect; }, [onStationSelect]);
  useEffect(() => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const updateCapability = () => setWebglAvailable(canRenderWebGL() && !reduceMotion?.matches);
    updateCapability();
    reduceMotion?.addEventListener?.('change', updateCapability);
    return () => reduceMotion?.removeEventListener?.('change', updateCapability);
  }, []);

  useEffect(() => {
    if (!webglAvailable || !mountRef.current) return undefined;

    const mount = mountRef.current;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const navigatorInfo = navigator;
    const lowPower = Boolean(
      (navigatorInfo.deviceMemory && navigatorInfo.deviceMemory <= 4) ||
      (navigatorInfo.hardwareConcurrency && navigatorInfo.hardwareConcurrency <= 4)
    );
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    camera.position.set(0, 0, DEFAULT_DISTANCE);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
    } catch {
      setWebglAvailable(false);
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.65));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = 'interactive-globe-canvas';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    mount.appendChild(renderer.domElement);

    const globeRoot = new THREE.Group();
    globeRoot.position.x = 0.72;
    globeRoot.rotation.x = -0.28;
    scene.add(globeRoot);

    scene.add(new THREE.HemisphereLight(0x9edcff, 0x0a1727, 1.55));
    const keyLight = new THREE.DirectionalLight(0xc3edff, 2.2);
    keyLight.position.set(-5, 4, 7);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x11bff3, 3.2, 15);
    rimLight.position.set(4.5, -1, 5);
    scene.add(rimLight);

    const sphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS, lowPower ? 48 : 80, lowPower ? 32 : 60);
    const baseTexture = makeLowDetailTexture();
    const baseMaterial = new THREE.MeshPhongMaterial({ map: baseTexture, shininess: 9, specular: new THREE.Color(0x1b6393) });
    const earth = new THREE.Mesh(sphereGeometry, baseMaterial);
    globeRoot.add(earth);

    const detailMaterial = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0,
      shininess: 13,
      specular: new THREE.Color(0x2b79a6),
      depthWrite: false
    });
    const detailEarth = new THREE.Mesh(sphereGeometry, detailMaterial);
    detailEarth.renderOrder = 1;
    globeRoot.add(detailEarth);
    let textureLoaded = false;
    let disposed = false;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/assets/earth-atmos-2048.jpg', (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), lowPower ? 1 : 4);
      detailMaterial.map = texture;
      detailMaterial.needsUpdate = true;
      textureLoaded = true;
    });

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(EARTH_RADIUS * 1.035, lowPower ? 48 : 80, lowPower ? 32 : 60),
      new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `varying vec3 vNormal; void main() { vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vNormal; void main() { float rim = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.15); gl_FragColor = vec4(0.04, 0.62, 1.0, clamp(rim * 0.72, 0.0, 0.72)); }`
      })
    );
    globeRoot.add(atmosphere);

    const grid = new THREE.Group();
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x148fc4, transparent: true, opacity: 0.17 });
    [-60, -30, 0, 30, 60].forEach((latitude) => {
      const points = [];
      for (let longitude = 0; longitude <= 360; longitude += 6) points.push(latLngToVector3(latitude, longitude, EARTH_RADIUS * 1.007));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
    });
    [-120, -60, 0, 60, 120].forEach((longitude) => {
      const points = [];
      for (let latitude = -90; latitude <= 90; latitude += 3) points.push(latLngToVector3(latitude, longitude, EARTH_RADIUS * 1.008));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
    });
    globeRoot.add(grid);

    const markerRoot = new THREE.Group();
    globeRoot.add(markerRoot);
    const markerPoints = {};
    STATION_POINTS.forEach((station) => {
      const point = latLngToVector3(station.lat, station.lon, EARTH_RADIUS * 1.035);
      markerPoints[station.id] = point;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: station.color, transparent: true, opacity: 0.22, depthTest: false }));
      halo.position.copy(point);
      halo.scale.setScalar(0.28);
      markerRoot.add(halo);
      const pin = new THREE.Sprite(new THREE.SpriteMaterial({ color: station.color, depthTest: false }));
      pin.position.copy(point.clone().multiplyScalar(1.025));
      pin.scale.setScalar(0.095);
      markerRoot.add(pin);
    });

    const indiaPoint = latLngToVector3(INDIA.lat, INDIA.lon, EARTH_RADIUS * 1.05);
    const lineMaterial = new THREE.LineDashedMaterial({ color: 0x26d9f5, dashSize: 0.08, gapSize: 0.06, transparent: true, opacity: 0.78 });
    STATION_POINTS.forEach((station) => {
      const start = markerPoints[station.id].clone();
      const end = indiaPoint.clone();
      const middle = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(EARTH_RADIUS * 1.44);
      const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
      const connection = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(36)), lineMaterial);
      connection.computeLineDistances();
      markerRoot.add(connection);
    });
    const indiaPin = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x22d9f4, depthTest: false }));
    indiaPin.position.copy(indiaPoint);
    indiaPin.scale.setScalar(0.115);
    markerRoot.add(indiaPin);

    const starsGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(lowPower ? 220 * 3 : 520 * 3);
    for (let i = 0; i < starPositions.length; i += 3) {
      const radius = 11 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.cos(phi);
      starPositions[i + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0x72c8f9, size: 0.026, transparent: true, opacity: 0.52 }));
    scene.add(stars);

    const targetRotation = { x: 0, y: 0 };
    const manualRotation = { x: -0.28, y: 0 };
    let targetDistance = DEFAULT_DISTANCE;
    let dragging = false;
    let dragStart = null;
    let currentTier = 'far';
    let currentCloseStation = null;
    let frameStart = performance.now();

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      camera.aspect = Math.max(width, 1) / Math.max(height, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const resetView = () => {
      targetDistance = DEFAULT_DISTANCE;
      targetRotation.x = 0;
      targetRotation.y = 0;
      manualRotation.x = -0.28;
      manualRotation.y = 0;
    };
    mount.__resetGlobeView = resetView;

    const setBackdropParallax = (pointerX = 0, pointerY = 0) => {
      document.documentElement.style.setProperty('--overview-parallax-x', `${pointerX * 0.22 * 0.15 * 420}px`);
      document.documentElement.style.setProperty('--overview-parallax-y', `${pointerY * 0.14 * 0.15 * 420}px`);
    };
    const onPointerMove = (event) => {
      const bounds = mount.getBoundingClientRect();
      const centerX = bounds.left + bounds.width * 0.6;
      const centerY = bounds.top + bounds.height * 0.5;
      const pointerX = THREE.MathUtils.clamp((event.clientX - centerX) / (bounds.width * 0.48), -1, 1);
      const pointerY = THREE.MathUtils.clamp((event.clientY - centerY) / (bounds.height * 0.5), -1, 1);
      if (!reducedMotion) {
        targetRotation.y = pointerX * 0.22;
        targetRotation.x = -pointerY * 0.14;
        setBackdropParallax(pointerX, pointerY);
      }
      if (dragging && dragStart) {
        manualRotation.y += (event.clientX - dragStart.x) * 0.007;
        manualRotation.x = THREE.MathUtils.clamp(manualRotation.x + (event.clientY - dragStart.y) * 0.004, -0.78, 0.06);
        dragStart = { x: event.clientX, y: event.clientY };
      }
    };
    const onPointerLeave = () => {
      targetRotation.x = 0;
      targetRotation.y = 0;
      setBackdropParallax(0, 0);
      dragging = false;
      dragStart = null;
    };
    const onPointerDown = (event) => {
      dragging = true;
      dragStart = { x: event.clientX, y: event.clientY };
      mount.setPointerCapture?.(event.pointerId);
    };
    const onPointerUp = () => {
      dragging = false;
      dragStart = null;
      // Pointer-up also covers touch end: only the intentional orbit remains,
      // while the cursor-parallax tilt eases back to the idle view.
      targetRotation.x = 0;
      targetRotation.y = 0;
    };
    const onWheel = (event) => {
      event.preventDefault();
      targetDistance = THREE.MathUtils.clamp(targetDistance + event.deltaY * 0.006, MIN_DISTANCE, MAX_DISTANCE);
    };
    const onDoubleClick = () => resetView();
    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerleave', onPointerLeave);
    mount.addEventListener('pointerdown', onPointerDown);
    mount.addEventListener('pointerup', onPointerUp);
    mount.addEventListener('pointercancel', onPointerUp);
    mount.addEventListener('wheel', onWheel, { passive: false });
    mount.addEventListener('dblclick', onDoubleClick);

    const projectToScreen = (localPoint) => {
      const point = localPoint.clone();
      markerRoot.localToWorld(point);
      const globeCenter = globeRoot.getWorldPosition(new THREE.Vector3());
      const normal = point.clone().sub(globeCenter).normalize();
      const toCamera = camera.position.clone().sub(point).normalize();
      point.project(camera);
      const bounds = mount.getBoundingClientRect();
      return {
        x: (point.x * 0.5 + 0.5) * bounds.width,
        y: (-point.y * 0.5 + 0.5) * bounds.height,
        facing: normal.dot(toCamera)
      };
    };

    const updateHtmlMarkers = () => {
      const indiaScreen = projectToScreen(indiaPoint);
      if (indiaRef.current) {
        const visible = indiaScreen.facing > 0.04;
        indiaRef.current.style.transform = `translate(-50%, -50%) translate(${indiaScreen.x}px, ${indiaScreen.y}px)`;
        indiaRef.current.style.opacity = visible ? '1' : '0';
      }
      let closestVisible = null;
      let bestDepth = -Infinity;
      STATION_POINTS.forEach((station) => {
        const screen = projectToScreen(markerPoints[station.id]);
        const visible = screen.facing > 0.04;
        const opacity = visible ? THREE.MathUtils.clamp((screen.facing + 0.04) * 1.2, 0, 1) : 0;
        const label = labelRefs.current[station.id];
        if (label) {
          label.style.transform = `translate(-50%, -50%) translate(${screen.x}px, ${screen.y}px)`;
          label.style.opacity = String(opacity);
          label.style.pointerEvents = opacity > 0.22 ? 'auto' : 'none';
        }
        const link = linkRefs.current[station.id];
        if (link) {
          link.setAttribute('x1', String(indiaScreen.x));
          link.setAttribute('y1', String(indiaScreen.y));
          link.setAttribute('x2', String(screen.x));
          link.setAttribute('y2', String(screen.y));
          link.style.opacity = visible && indiaScreen.facing > 0.04 ? '0.65' : '0';
        }
        if (visible && screen.facing > bestDepth) {
          closestVisible = station.id;
          bestDepth = screen.facing;
        }
      });
      if (currentTier === 'close' && closestVisible !== currentCloseStation) {
        currentCloseStation = closestVisible;
        setCloseStation(closestVisible);
      } else if (currentTier !== 'close' && currentCloseStation) {
        currentCloseStation = null;
        setCloseStation(null);
      }
    };

    const animate = (now) => {
      const elapsed = Math.min((now - frameStart) / 1000, 0.05);
      frameStart = now;
      if (!reducedMotion && !dragging) manualRotation.y += elapsed * 0.055;
      globeRoot.rotation.x = THREE.MathUtils.damp(globeRoot.rotation.x, manualRotation.x + targetRotation.x, 5.4, elapsed);
      globeRoot.rotation.y = THREE.MathUtils.damp(globeRoot.rotation.y, manualRotation.y + targetRotation.y, 5.4, elapsed);
      camera.position.z = THREE.MathUtils.damp(camera.position.z, targetDistance, 6.4, elapsed);
      camera.lookAt(globeRoot.position);
      globeRoot.updateMatrixWorld(true);

      const nextTier = camera.position.z < 5.45 ? 'close' : camera.position.z < 6.55 ? 'mid' : 'far';
      if (nextTier !== currentTier) {
        currentTier = nextTier;
        setZoomTier(nextTier);
      }
      const targetDetailOpacity = textureLoaded ? (lowPower ? 1 : nextTier === 'far' ? 0.73 : 1) : 0;
      detailMaterial.opacity = THREE.MathUtils.damp(detailMaterial.opacity, targetDetailOpacity, 3.8, elapsed);
      gridMaterial.opacity = THREE.MathUtils.damp(gridMaterial.opacity, nextTier === 'close' ? 0.07 : 0.17, 4, elapsed);
      updateHtmlMarkers();
      renderer.render(scene, camera);
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      setBackdropParallax(0, 0);
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      mount.removeEventListener('pointerdown', onPointerDown);
      mount.removeEventListener('pointerup', onPointerUp);
      mount.removeEventListener('pointercancel', onPointerUp);
      mount.removeEventListener('wheel', onWheel);
      mount.removeEventListener('dblclick', onDoubleClick);
      baseTexture.dispose();
      detailMaterial.map?.dispose();
      sphereGeometry.dispose();
      baseMaterial.dispose();
      detailMaterial.dispose();
      atmosphere.geometry.dispose();
      atmosphere.material.dispose();
      gridMaterial.dispose();
      starsGeometry.dispose();
      stars.material.dispose();
      lineMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [webglAvailable]);

  const resetView = () => mountRef.current?.__resetGlobeView?.();
  const selectedStation = closeStation || 'BHARATI';
  const selectedMetrics = stationMetrics[selectedStation] || {};

  return (
    <div className="absolute inset-0 z-[1] overflow-hidden" aria-label="Interactive globe showing Indian Antarctic stations">
      {webglAvailable === false && <GlobeFallback />}
      {webglAvailable === false && <FallbackStationMarkers onStationSelect={onSelectRef.current} />}
      <div ref={mountRef} className={`absolute inset-0 ${webglAvailable ? '' : 'pointer-events-none opacity-0'}`} />

      {webglAvailable && (
        <>
          <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            {STATION_POINTS.map((station) => (
              <line
                key={station.id}
                ref={(node) => { linkRefs.current[station.id] = node; }}
                stroke="#38d9f5"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
          </svg>

          <div ref={indiaRef} className="globe-overlay globe-india-label pointer-events-none">
            <span>🇮🇳</span><strong>INDIA</strong><span className="globe-external">↗</span>
            <small>Research · Collaboration</small>
          </div>

          {STATION_POINTS.map((station) => {
            const metrics = stationMetrics[station.id] || {};
            const status = metrics.status || (station.id === 'MAITRI' ? 'ACTIVE' : 'NORMAL');
            return (
              <button
                key={station.id}
                ref={(node) => { labelRefs.current[station.id] = node; }}
                type="button"
                onClick={() => onSelectRef.current?.(station.id)}
                className={`globe-overlay globe-station-label globe-station-${station.accent}`}
                aria-label={`Open ${station.name} digital twin`}
              >
                <span className="globe-station-beacon" />
                <span className="globe-station-copy">
                  <strong>{station.name}</strong>
                  <small>{station.coordinates}</small>
                  {zoomTier === 'close' && <em>{status} · {metrics.temp ?? '--'}°C · {metrics.health ?? '--'}% health</em>}
                </span>
              </button>
            );
          })}

          <div className="globe-controls" aria-label="Globe controls">
            <div className="globe-tier-indicator"><ZoomIn size={13} /> {zoomTier === 'far' ? 'Global overview' : zoomTier === 'mid' ? 'Terrain detail' : 'Station approach'}</div>
            <button type="button" onClick={resetView} title="Reset globe view"><RotateCcw size={15} /><span>Reset</span></button>
          </div>
          <div className="globe-gesture-hint"><MousePointer2 size={13} /> Drag to orbit · Scroll to zoom · Double click to reset</div>
          {zoomTier !== 'far' && <div className="globe-secondary-label">Southern Ocean <span>· East Antarctica detail</span></div>}

          {zoomTier === 'close' && closeStation && (
            <div className="globe-close-card">
              <div><Building2 size={16} /><span>{selectedStation === 'MAITRI' ? 'Maitri' : 'Bharati'} station in range</span></div>
              <p>{selectedMetrics.temp ?? '--'}°C · Wind {selectedMetrics.wind ?? '--'} km/h · {selectedMetrics.health ?? '--'}% health</p>
              <button type="button" onClick={() => onSelectRef.current?.(selectedStation)}>Enter Digital Twin <span>→</span></button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
