// ============================================================
// mergeStatic.js — 動かない部品のメッシュ・輪郭線を、マテリアルごとに 1 つへまとめる
//
// GPU は「メッシュ 1 個 = 描画 1 回」で描くので、細かい部品をメッシュに分けたままだと、
// 中身は軽くても描画の回数でスマホが重くなる。見た目は変えずに回数だけ減らす。
//
// Usage:
//   import { mergeStatic } from './mergeStatic.js';
//   const group = new THREE.Group();
//   ...（いつもどおりメッシュを足す）
//   mergeStatic(group);   // group の中身がマテリアルごとのメッシュ・線に置き換わる
//
// - group 自身の位置・回転・拡大はそのまま。中身の配置はジオメトリに焼き込む
// - マテリアル・castShadow・receiveShadow が同じメッシュどうし、マテリアルが同じ LineSegments どうしをまとめる
// - 透明なマテリアル（前後の並べ替えが効かなくなる）、マテリアルが配列のメッシュ、LineSegments 以外の線、
//   隠してあるもの、keep(obj) が true のもの（とその子孫）はまとめずにそのまま残す
// - メッシュ・線でない Object3D（当たり判定の矩形など）は残し、空になった Group は消す
// - まとめたジオメトリは新しく作る（元のジオメトリは共有されていることがあるので dispose しない）
// ============================================================

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function mergeStatic(root, { keep = () => false } = {}) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();

  // まとめるものを集める（key → [{ obj, matrix }]）
  const buckets = new Map();
  const taken = new Set();
  const visit = (obj) => {
    if (obj !== root && (keep(obj) || !obj.visible)) return;   // 隠してあるもの（光る輪郭など）も触らない
    if (obj !== root) {
      const key = keyOf(obj);
      if (key) {
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push({ obj, matrix: toRoot.clone().multiply(obj.matrixWorld) });
        taken.add(obj);
      }
    }
    for (const c of obj.children) visit(c);
  };
  visit(root);

  // まとめたものを外す（まとめない子は配置を保ったまま root の直下へ移す）
  for (const obj of taken) {
    for (const c of [...obj.children]) if (!taken.has(c)) root.attach(c);
    obj.removeFromParent();
  }
  removeEmptyGroups(root);

  for (const items of buckets.values()) {
    const src = items[0].obj;
    const geo = mergeGeometries(bake(items));
    const merged = src.isMesh ? new THREE.Mesh(geo, src.material) : new THREE.LineSegments(geo, src.material);
    merged.castShadow = src.castShadow;
    merged.receiveShadow = src.receiveShadow;
    root.add(merged);
  }
  return root;
}

function keyOf(obj) {
  const m = obj.material;
  if (!m || Array.isArray(m) || m.transparent) return null;
  if (obj.isMesh && !obj.isInstancedMesh && !obj.isSkinnedMesh) return `mesh:${m.uuid}:${obj.castShadow}:${obj.receiveShadow}`;
  if (obj.isLineSegments) return `lines:${m.uuid}`;
  return null;
}

// 配置を焼き込んだジオメトリの配列を返す（属性は全部が持つものだけ。インデックスは全部が持つときだけ残す）
function bake(items) {
  const names = Object.keys(items[0].obj.geometry.attributes)
    .filter(n => items.every(({ obj }) => obj.geometry.attributes[n]));
  const indexed = items.every(({ obj }) => obj.geometry.index);
  return items.map(({ obj, matrix }) => {
    const src = indexed || !obj.geometry.index ? obj.geometry : obj.geometry.toNonIndexed();
    let g = new THREE.BufferGeometry();
    for (const n of names) g.setAttribute(n, src.attributes[n].clone());
    if (indexed) g.setIndex(src.index.clone());
    g.applyMatrix4(matrix);
    // 裏返しの拡大（行列式が負）は面の向きが逆になるので、三角形の頂点の順を入れ替えて戻す
    if (obj.isMesh && matrix.determinant() < 0) g = flipWinding(g);
    return g;
  });
}

function flipWinding(g) {
  if (g.index) {
    const idx = g.index.array;
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    g.index.needsUpdate = true;
    return g;
  }
  for (const attr of Object.values(g.attributes)) {
    const a = attr.array, s = attr.itemSize;
    for (let v = 0; v < attr.count; v += 3) {
      for (let k = 0; k < s; k++) [a[(v + 1) * s + k], a[(v + 2) * s + k]] = [a[(v + 2) * s + k], a[(v + 1) * s + k]];
    }
  }
  return g;
}

function removeEmptyGroups(obj) {
  for (const c of [...obj.children]) {
    removeEmptyGroups(c);
    if (c.isGroup && c.children.length === 0) c.removeFromParent();
  }
}
