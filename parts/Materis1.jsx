// ============================================================
// Materis1.jsx — マテリス1：ざらざら
// 2枚のslab + 白い半球目 + 縦長黒六角形瞳
// マテリアル: グレー(0x9a9a9a) / flatShading / shininess:2
// Usage:
//   import { createMateris1 } from './Materis1.jsx';
//   const obj = createMateris1();  // THREE.Group
//   scene.add(obj);
// ============================================================

import * as THREE from 'three';
import { mergeStatic } from './mergeStatic.js';

const eps = 0.001;

function _createHex(hexGeo, hexMat) {
  const m = new THREE.Mesh(hexGeo, hexMat);
  m.scale.set(0.105, 0.35, 1);
  m.rotation.z = THREE.MathUtils.degToRad(-33);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createMateris1() {
  const slabMat = new THREE.MeshPhongMaterial({
    color: 0x9a9a9a, flatShading: true,
    shininess: 2, specular: 0x222222,
  });

  const sphereGeo = new THREE.SphereGeometry(2, 12, 8);
  const sp = sphereGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) {
    if (sp.getZ(i) < 0) sp.setZ(i, 0);
  }
  sp.needsUpdate = true;
  sphereGeo.computeVertexNormals();
  const sphereMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true, shininess: 30 });

  const hexShape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI / 2 + (Math.PI * 2 / 6) * i;
    const x = Math.cos(angle) * 2, y = Math.sin(angle) * 2;
    if (i === 0) hexShape.moveTo(x, y); else hexShape.lineTo(x, y);
  }
  hexShape.closePath();
  const hexGeo = new THREE.ExtrudeGeometry(hexShape, { depth: 0.2, bevelEnabled: false });
  const hexMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 20 });

  const root = new THREE.Group();

  const group1 = new THREE.Group();
  const geo1 = new THREE.BoxGeometry(7, 6, 2, 14, 12, 4);
  const pos1 = geo1.attributes.position;
  for (let i = 0; i < pos1.count; i++) {
    const x = pos1.getX(i), y = pos1.getY(i);
    if (x >= -2.5 - eps && x <= -0.5 + eps && y >= 1.0 - eps) pos1.setY(i, 1.0);
  }
  pos1.needsUpdate = true;
  geo1.computeVertexNormals();
  const slab1 = new THREE.Mesh(geo1, slabMat);
  slab1.position.set(-6, 0, 0);
  slab1.castShadow = true; slab1.receiveShadow = true;
  group1.add(slab1);
  const sphere1 = new THREE.Mesh(sphereGeo, sphereMat);
  sphere1.scale.set(0.5, 0.5, 0.25);
  sphere1.position.set(-4.5, 1, 1.0);
  sphere1.castShadow = true; sphere1.receiveShadow = true;
  group1.add(sphere1);
  const hex1 = _createHex(hexGeo, hexMat);
  hex1.position.set(-4.5, 1, 1.3);
  group1.add(hex1);
  root.add(group1);

  const group2 = new THREE.Group();
  const geo2 = new THREE.BoxGeometry(8, 6, 2, 16, 12, 4);
  const pos2 = geo2.attributes.position;
  for (let i = 0; i < pos2.count; i++) {
    const x = pos2.getX(i), y = pos2.getY(i);
    if (x >= 2.0 - eps && y >= 0.0 - eps && y <= 1.0 + eps) pos2.setX(i, 2.0);
  }
  pos2.needsUpdate = true;
  geo2.computeVertexNormals();
  const slab2 = new THREE.Mesh(geo2, slabMat);
  slab2.position.set(2, 0, 0);
  slab2.castShadow = true; slab2.receiveShadow = true;
  group2.add(slab2);
  const sphere2 = new THREE.Mesh(sphereGeo, sphereMat);
  sphere2.scale.set(0.5, 0.5, 0.25);
  sphere2.position.set(2, 0.5, 1.0);
  sphere2.castShadow = true; sphere2.receiveShadow = true;
  group2.add(sphere2);
  const hex2 = _createHex(hexGeo, hexMat);
  hex2.position.set(2, 0.5, 1.3);
  group2.add(hex2);
  group2.position.set(-3, 6, 0);
  root.add(group2);

  root.position.set(4, 1, 0);
  root.rotation.z = THREE.MathUtils.degToRad(33);
  return mergeStatic(root);   // マテリアルごとに 1 メッシュへ
}
