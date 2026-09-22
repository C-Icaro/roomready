import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createApartmentModel } from "./apartment-model";
import type { ApartmentModel } from "./apartment-model";
import { rooms } from "../lib/rooms";
import type { RoomId } from "../lib/rooms";
type Props = {
  selectedRoom: RoomId | "all";
  onSelectRoom: (id: RoomId | "all") => void;
  progress: number;
  roomProgress: Record<string, number>;
  planView: boolean;
};

export default function HomeScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const current = useRef(props);
  const requestDraw = useRef<(invalidateShadows?: boolean) => void>(() => {});
  const modelRef = useRef<ApartmentModel | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    current.current = props;
    const model = modelRef.current;
    let readinessChanged = false;
    if (model) {
      rooms.forEach((r) => {
        const readiness = THREE.MathUtils.clamp(
          props.roomProgress[r.id] || 0,
          0,
          1,
        );
        if (model.rooms[r.id].userData.readiness !== readiness) {
          // Readiness can hide packing boxes, changing the shadows they cast.
          model.setReadiness(r.id, readiness);
          readinessChanged = true;
        }
      });
      // Room selection changes floor emissive colours, not shadow geometry.
      model.setSelected(
        props.selectedRoom === "all" ? null : props.selectedRoom,
      );
    }
    requestDraw.current(readinessChanged);
  }, [props]);
  useEffect(() => {
    const element = mount.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5),
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.84;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute(
      "aria-label",
      "Interactive 3D home. Select rooms using the room buttons for keyboard access.",
    );
    canvas.setAttribute("role", "img");
    canvas.dataset.ready = "false";
    element.appendChild(canvas);
    const scene = new THREE.Scene();
    const model = createApartmentModel();
    modelRef.current = model;
    scene.add(model.root);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const env = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = env.texture;
    roomEnv.dispose();
    pmrem.dispose();
    scene.environmentIntensity = 0.45;
    scene.add(new THREE.HemisphereLight(0xfff8ed, 0x65735d, 1.2));
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    sun.position.set(-4, 13, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -9;
    sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 9;
    sun.shadow.camera.bottom = -9;
    sun.shadow.camera.far = 40;
    sun.shadow.normalBias = 0.035;
    sun.shadow.bias = -0.0001;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc8e2ff, 0.8);
    fill.position.set(8, 6, -5);
    scene.add(fill);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ color: 0x394132, opacity: 0.12 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.25;
    ground.receiveShadow = true;
    scene.add(ground);
    const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 100);
    camera.position.set(12, 13, 15);
    const look = new THREE.Vector3(0, 0.2, 0);
    const targetLook = look.clone();
    const targetPosition = camera.position.clone();
    let targetZoom = 1;
    let raf = 0;
    let isVisible = true;
    let disposed = false;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastTime = 0;
    const frames: number[] = [];
    let rendered = 0;
    function updateTarget() {
      const { selectedRoom, progress } = current.current;
      if (selectedRoom !== "all") {
        targetLook.copy(model.anchors[selectedRoom]);
        targetLook.y = 0.4;
        targetPosition.copy(targetLook).add(new THREE.Vector3(9, 11, 12));
        targetZoom = 1.42;
      } else {
        const p = reduced.matches ? 0 : progress;
        targetLook.set(0, 0.25, -0.3 * p);
        targetPosition.set(12 - 14 * p, 13 - 2 * p, 15 - 1.5 * p);
        targetZoom = 1 + 0.18 * Math.sin(p * Math.PI);
      }
    }
    function draw(time: number) {
      raf = 0;
      if (disposed || !isVisible) return;
      updateTarget();
      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;
      const alpha = reduced.matches ? 1 : 1 - Math.exp(-7 * dt);
      camera.position.lerp(targetPosition, alpha);
      look.lerp(targetLook, alpha);
      camera.zoom = THREE.MathUtils.lerp(camera.zoom, targetZoom, alpha);
      camera.lookAt(look);
      camera.updateProjectionMatrix();
      const start = performance.now();
      renderer.render(scene, camera);
      const renderMs = performance.now() - start;
      frames.push(renderMs);
      if (frames.length > 180) frames.shift();
      rendered++;
      canvas.dataset.ready = "true";
      canvas.dataset.camera = camera.position
        .toArray()
        .map((v) => v.toFixed(2))
        .join(",");
      canvas.dataset.triangles = String(renderer.info.render.triangles);
      canvas.dataset.drawCalls = String(renderer.info.render.calls);
      if (rendered % 10 === 0) {
        const sorted = [...frames].sort((a, b) => a - b);
        canvas.dataset.cpuRenderP50 =
          sorted[Math.floor(sorted.length * 0.5)].toFixed(2);
        canvas.dataset.cpuRenderP95 =
          sorted[Math.floor(sorted.length * 0.95)].toFixed(2);
        canvas.dataset.sampleCount = String(frames.length);
      }
      if (
        camera.position.distanceTo(targetPosition) > 0.005 ||
        look.distanceTo(targetLook) > 0.005 ||
        Math.abs(camera.zoom - targetZoom) > 0.001
      )
        raf = requestAnimationFrame(draw);
    }
    function request(invalidateShadows = false) {
      // Keep pending scene changes dirty while hidden; camera motion reuses the map.
      if (invalidateShadows) renderer.shadowMap.needsUpdate = true;
      if (!raf && isVisible) {
        lastTime = 0;
        raf = requestAnimationFrame(draw);
      }
    }
    requestDraw.current = request;
    function resize() {
      const { width, height } = element!.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      const size = aspect < 1 ? 6.2 / aspect : 6.2;
      camera.left = -size * aspect;
      camera.right = size * aspect;
      camera.top = size;
      camera.bottom = -size;
      camera.updateProjectionMatrix();
      request(true);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const visibility = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) request();
      },
      { threshold: 0 },
    );
    visibility.observe(element);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    function select(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.pickables, true);
      let node: THREE.Object3D | null = hits[0]?.object || null;
      while (node && !node.userData.roomId) node = node.parent;
      if (node?.userData.roomId) {
        const id = node.userData.roomId as RoomId;
        current.current.onSelectRoom(
          current.current.selectedRoom === id ? "all" : id,
        );
      }
    }
    function contextLost(event: Event) {
      event.preventDefault();
      setFailed(true);
    }
    canvas.addEventListener("click", select);
    canvas.addEventListener("webglcontextlost", contextLost);
    rooms.forEach((r) =>
      model.setReadiness(r.id, current.current.roomProgress[r.id] || 0),
    );
    resize();
    request(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      canvas.removeEventListener("click", select);
      canvas.removeEventListener("webglcontextlost", contextLost);
      model.dispose();
      env.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      renderer.dispose();
      canvas.remove();
      modelRef.current = null;
      requestDraw.current = () => {};
    };
  }, []);
  return (
    <div
      className={`home-visual ${props.planView || failed ? "show-plan" : ""}`}
    >
      <div
        ref={mount}
        className="webgl-mount"
        hidden={props.planView || failed}
      />
      {(props.planView || failed) && (
        <div className="floorplan" aria-label="Accessible room plan">
          {[rooms[2], rooms[1], rooms[3], rooms[0]].map((r) => (
            <button
              key={r.id}
              className={props.selectedRoom === r.id ? "active" : ""}
              style={{ "--room-color": r.color } as React.CSSProperties}
              onClick={() =>
                props.onSelectRoom(props.selectedRoom === r.id ? "all" : r.id)
              }
            >
              <r.icon size={32} strokeWidth={1.2} />
              <strong>{r.name}</strong>
              <span>
                {Math.round((props.roomProgress[r.id] || 0) * 100)}% ready
              </span>
              <div className="progress-track">
                <i
                  style={{ width: (props.roomProgress[r.id] || 0) * 100 + "%" }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
      {failed && (
        <span className="fallback-note">
          3D is unavailable on this device. Your full plan is still here.
        </span>
      )}
    </div>
  );
}
