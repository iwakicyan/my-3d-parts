import * as THREE from 'three';
import { createKummo } from './kummo.jsx';

// ============================================================
//  gondola 🌱 — 頭に木の芽の生えた雲生き物（kummo をもとに作業台 workspace/gondola.html で形を整えたもの）
//  createGondola()
//    原点=形の中心（作業台の原点）・+z が正面（顔の向き）・+y が上
//    大きさはモデル単位で 幅3（x ±1.5）×長さ4（z -2.35〜1.65）×高さ1.6（y -0.8〜0.79）（GONDOLA_BOUNDS）
//    作業台で動かした配置（GONDOLA_LAYOUT。パーツごとの 4x4 行列と色）をジオメトリに焼き込む（形の中のメッシュは位置・向き・倍率なし）
//    userData.walkable: 上を歩けるメッシュ（体と十二面体。芽や顔は含めない）
// ============================================================

export const GONDOLA_BOUNDS = { min: [-1.5, -0.8, -2.352], max: [1.5, 0.788, 1.648] };

// 作業台（workspace/gondola.html）で整えた配置。並びは kummo の中のメッシュ（体・十二面体・トーラス2つ・目）、芽（茎・葉 右・葉 左）の順
export const GONDOLA_LAYOUT = [
  { color: '#658560', m: [1,0,0,0, 0,0.88659,0,0, 0,0,1,0, 0,-0.13464,0.14826,1] },                                              // 体
  { color: '#6d8e67', m: [1.0237,0,0,0, 0,0.54478,-0.00505,0, 0,0.01051,1.13277,0, 0,0.00988,-0.26845,1] },                       // 十二面体
  { color: '#111111', m: [0.96307,0.15713,0.21864,0, -0.17378,-0.25751,0.95052,0, 0.10582,-0.49059,-0.11356,0, -0.42928,0.22203,1.12593,1] },  // トーラス（左の目）
  { color: '#111111', m: [0.96307,-0.15713,-0.21864,0, 0.17378,-0.25751,0.95052,0, -0.10582,-0.49059,-0.11356,0, 0.42928,0.22203,1.12593,1] }, // トーラス（右の目）
  { color: '#7a2a2a', m: [4.26,0,0,0, 0,1.05956,-0.20798,0, 0,1.43688,7.32036,0, 0,-0.06712,0.89792,1] },                          // 目だった小球をのばした口
  { color: '#7cc46a', m: [0.67411,0,0,0, 0,0.63375,0,0, 0,0,0.73976,0, 0.26319,0.43137,0.00802,1] },                              // 茎
  { color: '#7cc46a', m: [0.5041,0.19141,-0.35726,0, -0.21948,0.37626,0.17338,0, 0.42092,-0.00942,0.58184,0, 0.25344,0.69354,0.01288,1] },     // 葉 右
  { color: '#7cc46a', m: [-0.38406,0.19562,0.50355,0, 0.15264,0.37873,-0.23614,0, -0.56203,-0.01369,-0.41592,0, 0.27497,0.69602,0.00802,1] },  // 葉 左
];

// 芽の形（作業台と同じ。原点=根元）
const STEM_H = 0.45;
function sproutGeometries() {
  const stem = new THREE.CylinderGeometry(0.035, 0.05, STEM_H, 6, 1); stem.translate(0, STEM_H / 2, 0);
  const leaf = () => { const g = new THREE.IcosahedronGeometry(0.2, 0); g.scale(1.0, 0.28, 0.6); g.translate(0.2, 0, 0); return g; };
  return [stem, leaf(), leaf()];
}

export function createGondola() {
  const group = new THREE.Group();
  group.name = 'gondola';
  const kummoMeshes = [];
  createKummo().traverse(o => { if (o.isMesh) kummoMeshes.push(o); });
  const geos = [...kummoMeshes.map(o => o.geometry), ...sproutGeometries()];
  const mats = {};
  const matOf = (color) => mats[color] ??= new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 30 });
  const meshes = geos.map((g, i) => {
    const { color, m } = GONDOLA_LAYOUT[i];
    g.applyMatrix4(new THREE.Matrix4().fromArray(m));
    const mesh = new THREE.Mesh(g, matOf(color));
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  });
  group.userData.walkable = [meshes[0], meshes[1]];
  return group;
}
