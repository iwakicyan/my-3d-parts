import * as THREE from 'three';
import { mergeStatic } from '../parts/mergeStatic.js';

const DEG = Math.PI / 180;

export function createChairTree() {
  const mainGroup = new THREE.Group();

  const mat = new THREE.MeshPhongMaterial({ color: 0x63594C, flatShading: true });
  const hexGeo = new THREE.CylinderGeometry(5 / 7, 1, 4, 6);
  const triGeo = new THREE.ConeGeometry(1, 2, 3);

  function createPillarGroup(zRot) {
    const group = new THREE.Group();

    const cyl = new THREE.Mesh(hexGeo, mat);
    cyl.position.y = 2;
    cyl.castShadow = true;
    group.add(cyl);

    const cyl2 = new THREE.Mesh(hexGeo, mat);
    cyl2.scale.set(0.72, 0.36, 0.72);
    cyl2.position.set(-Math.sign(zRot) * 0.2, 4.5, 0);
    cyl2.rotation.z = Math.sign(zRot) * 12 * DEG;
    cyl2.castShadow = true;
    group.add(cyl2);

    if (zRot > 0) {
      const cyl3 = new THREE.Mesh(hexGeo, mat);
      cyl3.scale.set(0.432, 0.54, 0.432);
      cyl3.position.set(-0.7, 5.5, 0);
      cyl3.rotation.z = 40 * DEG;
      cyl3.castShadow = true;
      group.add(cyl3);
    }

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cone = new THREE.Mesh(triGeo, mat);
      cone.scale.set(0.9, 1.5, 1.5);
      const isOuter = Math.sin(angle) * Math.sign(zRot) > 0;
      cone.position.set(Math.sin(angle) * 0.5, isOuter ? 0.5 : 1, Math.cos(angle) * 0.5);
      cone.rotation.y = angle;
      cone.rotation.z = -zRot;
      cone.castShadow = true;
      group.add(cone);
    }

    return group;
  }

  [-4.5, 4.5].forEach(x => {
    const zRot = Math.sign(x) * 15 * DEG;
    const g = createPillarGroup(zRot);
    g.position.x = x;
    g.rotation.z = zRot;
    mainGroup.add(g);
  });

  // トーラス（y軸距離に応じてz軸方向へ頂点歪み加工）
  const torus = new THREE.Mesh(new THREE.TorusGeometry(1, 0.525, 5, 8), mat);
  const torusPos = torus.geometry.attributes.position;
  for (let i = 0; i < torusPos.count; i++) {
    const t = Math.abs(torusPos.getY(i)) / 1.525;
    torusPos.setZ(i, torusPos.getZ(i) - t * t);
  }
  torusPos.needsUpdate = true;
  torus.geometry.computeVertexNormals();
  torus.scale.set(0.8, 2, 1);
  torus.rotation.set(-60 * DEG, -15 * DEG, -80 * DEG);
  torus.position.set(-0.9, 5.5, 0.3);
  torus.castShadow = true;
  mainGroup.add(torus);

  // 枝
  const branchGeo = new THREE.ConeGeometry(0.4, 3, 3);
  [
    { rx:  30, ry:   0, rz:   5, x:  4.0, y: 1.0, z:  1.0, h: 4 },
    { rx: -30, ry:   0, rz:  50, x:  1.7, y: 5.8, z: -0.5, h: 3 },
    { rx:  -3, ry:   0, rz:   5, x: -5.3, y: 1.5, z:  0.0, h: 3 },
    { rx: -20, ry: -10, rz: -10, x:  5.0, y: 1.5, z: -1.0, h: 3 },
  ].forEach(({ rx, ry, rz, x, y, z, h }) => {
    const geo = h === 4 ? new THREE.ConeGeometry(0.4, 4, 3) : branchGeo;
    const branch = new THREE.Mesh(geo, mat);
    branch.rotation.set(rx * DEG, ry * DEG, rz * DEG);
    branch.position.set(x, y, z);
    branch.castShadow = true;
    mainGroup.add(branch);
  });

  const leafMats = [
    new THREE.MeshPhongMaterial({ color: 0x4A744E, flatShading: true }),
    new THREE.MeshPhongMaterial({ color: 0x50836A, flatShading: true }),
  ];
  const mkRng = seed => () => {
    seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
    return (seed >>> 0) / 0xffffffff;
  };

  function createLeafRing(count, radius, rng) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = radius + (rng() - 0.5) * 0.6;
      const geo = rng() > 0.5
        ? new THREE.OctahedronGeometry(0.6 + rng() * 0.8)
        : new THREE.IcosahedronGeometry(0.9 + rng() * 0.7);
      const leaf = new THREE.Mesh(geo, leafMats[Math.round(rng())]);
      leaf.position.set(Math.cos(angle) * r, (rng() - 0.5) * 1.2, Math.sin(angle) * r);
      leaf.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
      leaf.castShadow = true;
      group.add(leaf);
    }
    return group;
  }

  // 下段リング（10個・半径2.4）
  const leafGroup = createLeafRing(10, 2.4, mkRng(42));
  [-4, 4].forEach(x => {
    const lg = leafGroup.clone();
    lg.position.set(x, 2.5, 0);
    lg.rotation.z = Math.sign(x) * 10 * DEG;
    mainGroup.add(lg);
  });

  // 上段リング（8個・半径1.6）
  const leafGroup2 = createLeafRing(8, 1.6, mkRng(99));
  [-4, 4].forEach(x => {
    const lg = leafGroup2.clone();
    lg.position.set(x < 0 ? x + 1 : x - 1, 4.4, 0);
    lg.rotation.z = Math.sign(x) * 30 * DEG;
    mainGroup.add(lg);
  });

  // 十二面体（金色アクセント）
  const dodecaGeo = new THREE.DodecahedronGeometry(0.5);
  const dodecaMat = new THREE.MeshPhongMaterial({ color: 0xC6A42B, flatShading: true });
  [
    [3.5, 2.0, -1.5],
    [-3.5, 1.5,  2.0],
    [3.5, 3.5,  1.0],
  ].forEach(([x, y, z]) => {
    const d = new THREE.Mesh(dodecaGeo, dodecaMat);
    d.position.set(x, y, z);
    d.castShadow = true;
    mainGroup.add(d);
  });

  return mergeStatic(mainGroup);   // 幹・葉・飾りをマテリアルごとに 1 メッシュへ
}

export default createChairTree;
