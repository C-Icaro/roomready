/**
 * Original procedural apartment asset for the moving-home planner.
 * No downloaded models, textures or copied showcase artwork.
 * Coordinate system: metres, +Y up, +Z front; front and right walls are cut away.
 * Reference techniques: https://threejs.org/examples/webgl_lights_physical.html
 * https://threejs.org/examples/webgl_interactive_cubes.html
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type ApartmentRoomId = "living" | "kitchen" | "bedroom" | "bathroom";
export type ApartmentModel = {
  root: THREE.Group;
  rooms: Record<ApartmentRoomId, THREE.Group>;
  anchors: Record<ApartmentRoomId, THREE.Vector3>;
  pickables: THREE.Object3D[];
  setReadiness: (roomId: ApartmentRoomId, fraction: number) => void;
  setSelected: (roomId: ApartmentRoomId | null) => void;
  dispose: () => void;
};

export function createApartmentModel(): ApartmentModel {
  const root = new THREE.Group();
  root.name = "home-cutaway";
  const materials = new Map<string, THREE.MeshStandardMaterial>();
  const geometries = new Set<THREE.BufferGeometry>();
  const roomIds: ApartmentRoomId[] = [
    "living",
    "kitchen",
    "bedroom",
    "bathroom",
  ];
  const rooms = Object.fromEntries(
    roomIds.map((id) => {
      const group = new THREE.Group();
      group.name = id;
      group.userData.roomId = id;
      root.add(group);
      return [id, group];
    }),
  ) as Record<ApartmentRoomId, THREE.Group>;
  const anchors = {
    living: new THREE.Vector3(2.4, 0.8, 1.65),
    kitchen: new THREE.Vector3(2.25, 1.1, -2.15),
    bedroom: new THREE.Vector3(-2.6, 1.0, -1.9),
    bathroom: new THREE.Vector3(-2.65, 0.8, 1.75),
  };
  const pickables: THREE.Object3D[] = [];
  const packing: Record<ApartmentRoomId, THREE.Group[]> = {
    living: [],
    kitchen: [],
    bedroom: [],
    bathroom: [],
  };
  const stateMats = {} as Record<ApartmentRoomId, THREE.MeshStandardMaterial>;
  const floors = {} as Record<ApartmentRoomId, THREE.MeshStandardMaterial>;
  const P = {
    plaster: "#eee9df",
    edge: "#d3cbbc",
    oak: "#bd9165",
    oakLight: "#d4af82",
    cream: "#f1eadc",
    white: "#fcfaf4",
    navy: "#202d45",
    blue: "#496cf1",
    lime: "#d8f45b",
    sage: "#8c9b76",
    leaf: "#52765a",
    rust: "#b67654",
    cardboard: "#be9368",
    metal: "#878a86",
  };

  function mat(color: string, roughness = 0.8, metalness = 0) {
    const key = `${color}:${roughness}:${metalness}`;
    let material = materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
      });
      materials.set(key, material);
    }
    return material;
  }
  function mesh(
    g: THREE.BufferGeometry,
    material: THREE.Material,
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
  ) {
    geometries.add(g);
    const object = new THREE.Mesh(g, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(
    parent: THREE.Object3D,
    size: [number, number, number],
    pos: [number, number, number],
    color: string | THREE.Material,
    radius = 0,
  ) {
    const g = radius
      ? new RoundedBoxGeometry(...size, 2, radius)
      : new THREE.BoxGeometry(...size);
    return mesh(
      g,
      typeof color === "string" ? mat(color) : color,
      parent,
      ...pos,
    );
  }
  function cylinder(
    parent: THREE.Object3D,
    r: number,
    h: number,
    pos: [number, number, number],
    color: string,
    top = r,
  ) {
    return mesh(
      new THREE.CylinderGeometry(top, r, h, 20),
      mat(color),
      parent,
      ...pos,
    );
  }
  function sphere(
    parent: THREE.Object3D,
    radius: number,
    pos: [number, number, number],
    color: string,
  ) {
    return mesh(
      new THREE.SphereGeometry(radius, 16, 12),
      mat(color),
      parent,
      ...pos,
    );
  }
  function plant(
    parent: THREE.Object3D,
    x: number,
    z: number,
    scale = 1,
    y = 0.16,
  ) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    cylinder(g, 0.24, 0.45, [0, 0.23, 0], P.rust, 0.29);
    cylinder(g, 0.245, 0.03, [0, 0.46, 0], "#493d31");
    cylinder(g, 0.025, 0.72, [0, 0.8, 0], P.leaf);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4;
      const leaf = sphere(
        g,
        0.22,
        [Math.sin(angle) * 0.21, 0.77 + i * 0.075, Math.cos(angle) * 0.21],
        i % 2 ? "#769060" : P.leaf,
      );
      leaf.scale.set(0.65, 1.7, 0.6);
      leaf.rotation.z = Math.cos(angle) * 0.55;
    }
  }
  function packingBox(
    id: ApartmentRoomId,
    x: number,
    z: number,
    size = 0.57,
    y = 0.18,
  ) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = packing[id].length % 2 ? -0.12 : 0.06;
    rooms[id].add(g);
    box(g, [size, size * 0.84, size], [0, size * 0.42, 0], P.cardboard, 0.015);
    box(
      g,
      [0.105, 0.008, size + 0.005],
      [0, size * 0.84 + 0.008, 0],
      "#e6c68b",
    );
    box(
      g,
      [size * 0.34, size * 0.2, 0.007],
      [size * 0.14, size * 0.5, size / 2 + 0.004],
      P.white,
    );
    box(
      g,
      [size * 0.18, 0.017, 0.008],
      [size * 0.14, size * 0.52, size / 2 + 0.009],
      P.navy,
    );
    packing[id].push(g);
  }
  function leg(
    parent: THREE.Object3D,
    x: number,
    z: number,
    height: number,
    y = 0.16,
  ) {
    cylinder(parent, 0.04, height, [x, y + height / 2, z], P.oak);
  }

  // A thin floating plinth gives the house an architectural-model silhouette.
  box(root, [10.5, 0.2, 7.8], [0, -0.01, 0], P.plaster, 0.06);
  box(root, [10.15, 0.12, 7.46], [0, 0.13, 0], P.oakLight);
  const bounds: Record<ApartmentRoomId, [number, number, number, number]> = {
    living: [2.28, 1.85, 5.42, 3.55],
    kitchen: [2.28, -1.86, 5.42, 3.57],
    bedroom: [-2.82, -1.85, 4.65, 3.6],
    bathroom: [-2.82, 1.85, 4.65, 3.55],
  };
  for (const id of roomIds) {
    const [x, z, w, d] = bounds[id];
    const floorMat = mat(
      id === "bathroom" ? "#d5ded6" : id === "kitchen" ? "#e0d9c9" : P.oakLight,
    ).clone();
    materials.set(`floor-${id}`, floorMat);
    floors[id] = floorMat;
    const floor = box(rooms[id], [w, 0.035, d], [x, 0.21, z], floorMat);
    floor.userData.roomId = id;
    pickables.push(floor);
    // Parallel joins read as oak planks while requiring no image textures.
    const spacing = id === "bathroom" ? 0.59 : 0.38;
    for (let px = x - w / 2 + spacing; px < x + w / 2; px += spacing) {
      box(
        rooms[id],
        [0.008, 0.003, d - 0.04],
        [px, 0.23, z],
        id === "bathroom" ? "#bcc9c0" : "#be9a75",
      );
    }
    if (id === "bathroom")
      for (let pz = z - d / 2 + spacing; pz < z + d / 2; pz += spacing) {
        box(rooms[id], [w - 0.04, 0.003, 0.008], [x, 0.232, pz], "#bcc9c0");
      }
  }

  // Tall rear walls and low partitions leave every task-bearing room visible.
  box(root, [10.4, 2.25, 0.18], [0, 1.31, -3.69], P.plaster);
  box(root, [0.18, 2.25, 7.45], [-5.12, 1.31, 0], P.plaster);
  box(root, [10.4, 0.055, 0.21], [0, 2.465, -3.69], P.white);
  box(root, [0.21, 0.055, 7.45], [-5.12, 2.465, 0], P.white);
  box(root, [0.12, 0.74, 6.24], [-0.45, 0.59, -0.55], P.plaster);
  box(root, [0.16, 0.05, 6.26], [-0.45, 0.985, -0.55], P.white);
  box(root, [3.5, 0.72, 0.12], [-3.33, 0.58, 0.05], P.plaster);
  box(root, [3.52, 0.05, 0.16], [-3.33, 0.965, 0.05], P.white);
  for (const x of [-2.8, 2.15]) {
    box(root, [2.0, 1.2, 0.07], [x, 1.62, -3.58], "#abc4c8");
    for (const dx of [-1.03, 0, 1.03])
      box(root, [0.065, 1.32, 0.13], [x + dx, 1.62, -3.51], P.white);
    for (const dy of [-0.64, 0.64])
      box(root, [2.13, 0.07, 0.13], [x, 1.62 + dy, -3.51], P.white);
    box(root, [2.24, 0.08, 0.28], [x, 0.92, -3.44], P.oakLight);
  }
  // Slim baseboards.
  box(root, [10.16, 0.13, 0.04], [0, 0.31, -3.57], P.white);
  box(root, [0.04, 0.13, 7.21], [-5.0, 0.31, 0], P.white);

  // Living room: generous bouclé sofa, layered rug and warm oak furniture.
  const living = rooms.living;
  box(living, [3.25, 0.025, 2.58], [2.03, 0.244, 1.69], "#eee5cd", 0.025);
  box(living, [3.02, 0.028, 2.35], [2.03, 0.26, 1.69], "#e4dac1", 0.025);
  box(living, [2.95, 0.31, 0.92], [2.17, 0.57, 2.83], "#c5cdb8", 0.11);
  box(living, [3.04, 0.73, 0.23], [2.17, 0.88, 3.15], "#adbba0", 0.07);
  for (const x of [0.69, 3.65])
    box(living, [0.22, 0.63, 1.0], [x, 0.78, 2.79], "#b6c3a8", 0.06);
  for (const x of [1.23, 2.16, 3.08])
    box(living, [0.87, 0.2, 0.73], [x, 0.83, 2.71], "#d0d8c2", 0.075);
  const pillow1 = box(
    living,
    [0.43, 0.43, 0.16],
    [1.03, 1.04, 2.91],
    "#ede2c6",
    0.065,
  );
  pillow1.rotation.z = -0.15;
  const pillow2 = box(
    living,
    [0.43, 0.43, 0.16],
    [3.23, 1.04, 2.91],
    P.rust,
    0.065,
  );
  pillow2.rotation.z = 0.2;
  cylinder(living, 0.66, 0.085, [2.08, 0.67, 1.3], P.oakLight);
  cylinder(living, 0.22, 0.4, [2.08, 0.44, 1.3], P.oak);
  box(living, [0.38, 0.04, 0.27], [2.02, 0.735, 1.24], P.blue);
  box(living, [0.32, 0.035, 0.23], [2.04, 0.77, 1.25], P.cream);
  cylinder(living, 0.075, 0.09, [2.43, 0.76, 1.35], P.rust);
  box(living, [2.04, 0.45, 0.48], [2.08, 0.48, 0.31], P.oak, 0.025);
  for (const x of [1.56, 2.59])
    box(living, [0.91, 0.32, 0.025], [x, 0.5, 0.565], P.oakLight);
  box(living, [1.35, 0.83, 0.055], [2.08, 1.19, 0.25], P.navy, 0.022);
  box(living, [1.24, 0.71, 0.012], [2.08, 1.19, 0.284], "#414d63", 0.016);
  plant(living, 4.41, 2.91, 1.2, 0.22);
  cylinder(living, 0.26, 0.035, [4.09, 0.255, 0.76], P.navy);
  cylinder(living, 0.023, 1.78, [4.09, 1.15, 0.76], P.navy);
  cylinder(living, 0.34, 0.38, [4.09, 2.03, 0.76], P.cream, 0.21);
  packingBox("living", 0.45, 1.0, 0.56, 0.25);
  packingBox("living", 4.19, 1.78, 0.64, 0.25);
  packingBox("living", 4.23, 1.79, 0.43, 0.79);

  // Kitchen: green cabinets, stone worktop, visible hob and compact island.
  const kitchen = rooms.kitchen;
  box(kitchen, [3.75, 0.82, 0.67], [2.53, 0.65, -3.09], "#879383");
  box(kitchen, [3.88, 0.075, 0.76], [2.53, 1.1, -3.05], "#efe9d9", 0.02);
  for (const x of [1.0, 1.76, 2.53, 3.3, 4.05]) {
    box(kitchen, [0.7, 0.66, 0.028], [x, 0.66, -2.74], "#97a38e", 0.012);
    box(kitchen, [0.19, 0.026, 0.025], [x, 0.89, -2.714], P.navy);
  }
  box(kitchen, [0.75, 0.025, 0.49], [3.49, 1.151, -3.0], P.navy, 0.03);
  for (const x of [3.28, 3.68])
    for (const z of [-3.13, -2.89])
      cylinder(kitchen, 0.085, 0.012, [x, 1.176, z], "#677185");
  box(kitchen, [0.69, 0.03, 0.43], [1.33, 1.146, -3.0], P.metal, 0.04);
  box(kitchen, [0.56, 0.025, 0.32], [1.33, 1.164, -3.0], "#b7c4c5", 0.045);
  cylinder(kitchen, 0.025, 0.31, [1.33, 1.3, -3.26], P.metal);
  box(kitchen, [0.23, 0.045, 0.045], [1.43, 1.44, -3.26], P.metal);
  box(kitchen, [0.88, 1.94, 0.81], [4.48, 1.21, -1.74], P.white, 0.045);
  box(kitchen, [0.018, 0.43, 0.03], [4.17, 1.55, -1.318], P.metal);
  box(kitchen, [0.86, 0.019, 0.02], [4.48, 0.88, -1.319], "#d4d8cf");
  box(kitchen, [1.84, 0.78, 0.72], [1.79, 0.63, -1.13], P.oak, 0.025);
  box(kitchen, [2.01, 0.09, 0.96], [1.79, 1.07, -1.03], P.cream, 0.025);
  for (const x of [1.2, 2.32]) {
    cylinder(kitchen, 0.24, 0.07, [x, 0.76, -0.3], P.navy);
    for (const dx of [-0.12, 0.12])
      for (const dz of [-0.12, 0.12])
        leg(kitchen, x + dx, -0.3 + dz, 0.47, 0.255);
  }
  cylinder(kitchen, 0.16, 0.095, [2.32, 1.17, -1.11], P.rust);
  for (const x of [2.25, 2.37])
    sphere(kitchen, 0.074, [x, 1.24, -1.11], "#d5b15a");
  plant(kitchen, 0.65, -3.0, 0.44, 1.15);
  packingBox("kitchen", 3.64, -0.44, 0.48, 0.25);
  packingBox("kitchen", 3.13, -0.67, 0.42, 0.25);

  // Bedroom: upholstered headboard, folded throw, bedside lamp and artwork.
  const bedroom = rooms.bedroom;
  box(bedroom, [2.98, 0.03, 2.92], [-2.72, 0.245, -1.78], "#e9dfcc", 0.025);
  box(bedroom, [2.21, 0.37, 2.59], [-2.71, 0.47, -1.95], P.oak, 0.06);
  box(bedroom, [2.2, 1.08, 0.16], [-2.71, 0.91, -3.26], "#bd9679", 0.055);
  box(bedroom, [2.11, 0.26, 2.48], [-2.71, 0.775, -1.95], P.cream, 0.1);
  box(bedroom, [2.13, 0.16, 1.64], [-2.71, 0.9, -1.52], "#d9e0c9", 0.065);
  box(bedroom, [2.15, 0.075, 0.48], [-2.71, 1.008, -0.94], P.rust, 0.025);
  for (const x of [-3.22, -2.2])
    box(bedroom, [0.82, 0.15, 0.56], [x, 0.99, -2.77], P.white, 0.095);
  for (const x of [-4.18, -1.21]) {
    box(bedroom, [0.57, 0.5, 0.57], [x, 0.49, -2.99], P.oakLight, 0.025);
    box(bedroom, [0.42, 0.24, 0.018], [x, 0.5, -2.69], P.oak);
  }
  cylinder(bedroom, 0.11, 0.045, [-4.18, 0.77, -2.99], P.navy);
  cylinder(bedroom, 0.026, 0.22, [-4.18, 0.88, -2.99], P.navy);
  cylinder(bedroom, 0.19, 0.26, [-4.18, 1.11, -2.99], P.cream, 0.12);
  box(bedroom, [0.045, 0.81, 0.65], [-4.986, 1.49, -1.25], P.oak);
  box(bedroom, [0.05, 0.69, 0.53], [-4.953, 1.49, -1.25], P.cream);
  const artwork = sphere(bedroom, 0.17, [-4.915, 1.51, -1.25], P.rust);
  artwork.scale.x = 0.055;
  plant(bedroom, -4.38, -0.45, 0.7, 0.25);
  packingBox("bedroom", -1.11, -0.77, 0.48, 0.25);
  packingBox("bedroom", -1.16, -1.36, 0.57, 0.25);

  // Bathroom: glazed tile floor, freestanding bath and oak vanity.
  const bathroom = rooms.bathroom;
  box(bathroom, [1.12, 0.55, 2.3], [-4.25, 0.57, 1.64], P.white, 0.16);
  box(bathroom, [0.85, 0.08, 1.97], [-4.25, 0.87, 1.64], "#d2deda", 0.17);
  box(bathroom, [0.69, 0.03, 1.76], [-4.25, 0.914, 1.64], "#a9c8cb", 0.14);
  cylinder(bathroom, 0.022, 0.39, [-4.77, 0.96, 1.01], P.metal);
  box(bathroom, [0.26, 0.035, 0.035], [-4.66, 1.14, 1.01], P.metal);
  box(bathroom, [1.61, 0.63, 0.57], [-2.2, 0.59, 0.62], P.oakLight, 0.025);
  box(bathroom, [1.67, 0.07, 0.65], [-2.2, 0.95, 0.62], P.white, 0.025);
  cylinder(bathroom, 0.3, 0.12, [-2.2, 1.045, 0.62], P.white, 0.33);
  cylinder(bathroom, 0.024, 0.23, [-2.2, 1.1, 0.36], P.metal);
  box(bathroom, [0.035, 0.035, 0.16], [-2.2, 1.215, 0.425], P.metal);
  for (let i = 0; i < 3; i++)
    box(
      bathroom,
      [0.42, 0.065, 0.26],
      [-1.65, 1.025 + i * 0.065, 0.64],
      i === 1 ? P.sage : P.cream,
      0.025,
    );
  box(bathroom, [1.6, 0.022, 0.64], [-2.1, 0.254, 2.72], "#e8dbc0", 0.045);
  plant(bathroom, -1.05, 3.04, 0.8, 0.24);
  packingBox("bathroom", -1.36, 1.65, 0.45, 0.25);

  // Readiness tokens encode progress through completion colour and box count.
  for (const id of roomIds) {
    const tokenMat = new THREE.MeshStandardMaterial({
      color: P.blue,
      roughness: 0.5,
      emissive: P.blue,
      emissiveIntensity: 0.04,
    });
    materials.set(`token-${id}`, tokenMat);
    stateMats[id] = tokenMat;
    const a = anchors[id];
    const marker = mesh(
      new THREE.TorusGeometry(0.2, 0.045, 8, 28),
      tokenMat,
      rooms[id],
      a.x,
      0.32,
      a.z + 0.47,
    );
    marker.rotation.x = -Math.PI / 2;
    marker.userData.roomId = id;
    pickables.push(marker);
    rooms[id].traverse((object) => {
      object.userData.roomId = id;
    });
    pickables.push(rooms[id]);
  }
  function setReadiness(id: ApartmentRoomId, fraction: number) {
    const p = THREE.MathUtils.clamp(fraction, 0, 1);
    packing[id].forEach((group, index) => {
      group.visible = index < Math.ceil((1 - p) * packing[id].length);
    });
    stateMats[id].color.set(p >= 1 ? P.lime : P.blue);
    stateMats[id].emissive.copy(stateMats[id].color);
    rooms[id].userData.readiness = p;
  }
  function setSelected(id: ApartmentRoomId | null) {
    for (const roomId of roomIds) {
      floors[roomId].emissive.set(roomId === id ? "#bd9c55" : "#000000");
      floors[roomId].emissiveIntensity = roomId === id ? 0.12 : 0;
    }
  }
  function dispose() {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    root.clear();
  }
  return {
    root,
    rooms,
    anchors,
    pickables,
    setReadiness,
    setSelected,
    dispose,
  };
}

/** Camera rail: interpolate adjacent phases using smoothstep, then lookAt(target). */
export const APARTMENT_CAMERA_PHASES = [
  { at: 0, position: [12.5, 11, 14.5], target: [0, 0.45, 0], zoom: 1 },
  { at: 0.3, position: [9.5, 12.5, 14.5], target: [0, 0.4, 0], zoom: 1.03 },
  { at: 0.65, position: [6.5, 15, 11.5], target: [0, 0.25, 0.2], zoom: 1.08 },
  { at: 1, position: [5.5, 17.5, 7.5], target: [0, 0.1, 0.2], zoom: 1.11 },
] as const;
