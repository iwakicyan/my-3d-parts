/**
 * Frame.jsx
 * ローポリ格子フレーム — 小・中・大の3サイズ
 *
 * 使い方:
 *   import { createFrameS, createFrameM, createFrameL } from './Frame.jsx';
 *
 *   const frame = createFrameS();       // 小 (8-4)
 *   frame.position.set(0, 0, 0);
 *   scene.add(frame);
 *
 * サイズ定義:
 *   S (小) createFrameS() — halfSize=2, height=8
 *   M (中) createFrameM() — halfSize=3, height=10
 *   L (大) createFrameL() — halfSize=4, height=18
 *
 * Standard: flatShading:true, castShadow:true, THREE.Group
 *
 * 角材（柱・梁）はすべて同じ黒のマテリアルなので、1つのジオメトリに結合して 1 メッシュで描く。
 * 角材ごとにメッシュを分けると、大 (L) で 104 本 = 104 回の描画になり重い。
 * 結合したジオメトリはサイズごとに作り置きして使い回す（dispose しないこと）
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const T = 0.1;   // 角材の太さ
const geoCache = new Map();   // `${halfSize},${height}` → 結合したジオメトリ

// 外周の縦柱（格子点、間隔1）と、y=1〜height に間隔1で外周4辺の横梁を並べ、1つのジオメトリにする
function frameGeometry(halfSize, height) {
  const key = `${halfSize},${height}`;
  if (geoCache.has(key)) return geoCache.get(key);

  const parts = [];
  const add = (w, h, d, x, y, z) => parts.push(new THREE.BoxGeometry(w, h, d).translate(x, y, z));

  // 縦柱: 外周 (x=±halfSize OR z=±halfSize) の格子点のみ
  for (let x = -halfSize; x <= halfSize; x++) {
    for (let z = -halfSize; z <= halfSize; z++) {
      if (Math.abs(x) === halfSize || Math.abs(z) === halfSize) add(T, height, T, x, height / 2, z);
    }
  }

  // 横梁: y=1〜height 間隔1、外周4辺
  const span = halfSize * 2;
  for (let y = 1; y <= height; y++) {
    add(span, T, T,  0, y,  halfSize); // 前面
    add(span, T, T,  0, y, -halfSize); // 後面
    add(T, T, span, -halfSize, y,  0); // 左面
    add(T, T, span,  halfSize, y,  0); // 右面
  }

  const geo = mergeGeometries(parts);
  parts.forEach(g => g.dispose());
  geoCache.set(key, geo);
  return geo;
}

export function createFrame(halfSize, height) {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true });
  const mesh = new THREE.Mesh(frameGeometry(halfSize, height), mat);
  mesh.castShadow = true;
  group.add(mesh);
  return group;
}

export const createFrameS = () => createFrame(2, 8);   // 小
export const createFrameM = () => createFrame(3, 10);  // 中
export const createFrameL = () => createFrame(4, 18);  // 大
