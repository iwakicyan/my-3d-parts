// ============================================================
// forest1.jsx — ローポリ球群の森
// my-3d-parts standard
//   - flatShading: true / castShadow: true（全メッシュ）
//   - THREE.Group パターン
//   - シード固定乱数（mulberry32, seed=42）
//   - 球3種 × 計16個 + 半透明球4個 + 細柱（球あたり2〜3本）
//   - 球カラー: #3CAD90 / #53AE81 / #4A967F
//   - 柱カラー: #80836A
// Usage:
//   import { createForest1 } from './forest1.jsx';
//   const forest = createForest1();
//   scene.add(forest);
// ============================================================

import * as THREE from "three";
import { mergeStatic } from './mergeStatic.js';

// シード固定乱数
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function createForest1() {
  const group = new THREE.Group();
  const rand = mulberry32(42);

  const ballGeo = new THREE.IcosahedronGeometry(1.2, 1);
  const scaleY = 1.0 / 1.2;

  // 球3種
  const ballTypes = [
    { color: 0x3CAD90, sx: 2.0 * 1.2, sy: scaleY * 0.6, sz: 2.0 * 1.2, count: 6, range: 6.0, opacity: 1.0 },
    { color: 0x53AE81, sx: 1.6 * 1.2, sy: scaleY * 0.6, sz: 1.6 * 1.2, count: 6, range: 6.0, opacity: 1.0 },
    { color: 0x4A967F, sx: 1.2 * 1.2, sy: 1.0 * 0.6,   sz: 1.2 * 1.2, count: 4, range: 5.0, opacity: 1.0 },
  ];

  const ballPositions = [];
  ballTypes.forEach(({ color, sx, sy, sz, count, range, opacity }) => {
    const mat = new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 30, transparent: opacity < 1.0, opacity });
    for (let i = 0; i < count; i++) {
      const ball = new THREE.Mesh(ballGeo, mat);
      const px = (rand() * 2 - 1) * range;
      const pz = (rand() * 2 - 1) * range;
      ball.position.set(px, (rand() * 2 - 1) * 0.5 + 1.5, pz);
      ball.scale.set(sx, sy, sz);
      ball.rotation.y = rand() * Math.PI * 2;
      ball.castShadow = true;
      group.add(ball);
      ballPositions.push({ x: px, z: pz });
    }
  });

  // 半透明球（固定位置）
  const transmat = new THREE.MeshPhongMaterial({ color: 0x4A967F, flatShading: true, shininess: 30, transparent: true, opacity: 0.7 });
  [{ x: 2, z: 2 }, { x: -2, z: -2 }, { x: 2, z: -2 }, { x: -2, z: 2 }].forEach(({ x, z }) => {
    const ball = new THREE.Mesh(ballGeo, transmat);
    ball.position.set(x, (rand() * 2 - 1) * 0.5 + 1.5, z);
    ball.scale.set(1.2 * 1.2, 1.0 * 0.6, 1.2 * 1.2);
    ball.rotation.y = rand() * Math.PI * 2;
    ball.castShadow = true;
    group.add(ball);
    ballPositions.push({ x, z });
  });

  // 細柱（球の下に2〜3本）
  const pillarGeo = new THREE.BoxGeometry(0.1, 2.0, 0.1);
  const pillarMat = new THREE.MeshPhongMaterial({ color: 0x80836A, flatShading: true });
  ballPositions.forEach(({ x, z }) => {
    const count = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < count; i++) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(
        x + (rand() * 2 - 1) * 1.2,
        0.5,
        z + (rand() * 2 - 1) * 1.2
      );
      pillar.rotation.y = rand() * Math.PI * 2;
      pillar.castShadow = true;
      group.add(pillar);
    }
  });

  return mergeStatic(group);   // 柱・球をマテリアルごとに 1 メッシュへ（半透明の球はそのまま）
}
