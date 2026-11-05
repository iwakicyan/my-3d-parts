import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createKummo } from './kummo.jsx';
import { GONDOLA_LAYOUT } from './gondola.js';

// ============================================================
//  gondeer 🦌 — 頭の左右に半円のティアラ（角のように立てたもの）を載せた雲生き物（gondola から木の芽を外して作業台 workspace/gondeer.html で形を整えたもの）
//  createGondeer()
//    原点=形の中心（作業台の原点）・+z が正面（顔の向き）・+y が上・大きさはモデル単位（gondola と同じ。幅3×長さ4 ほど）
//    kummo の 5 つのメッシュは gondola の配置（GONDOLA_LAYOUT）に、作業台で動かした分（GONDEER_LAYOUT）を重ねてジオメトリに焼き込む
//    ティアラ 2 つ（帯 1 つ＋とげ 5 本ずつ）は作業台と同じ形を作って GONDEER_LAYOUT で置き、1 色なので 1 つのメッシュにまとめる
//    userData.walkable: 上を歩けるメッシュ（体と十二面体）
//    userData.bodyBox: 体と十二面体を囲む箱（原点の座標。埋める深さを決める用）
//    userData.walls: ティアラの帯に沿った当たり判定の線分 [x1, z1, x2, z2]（原点の座標の XZ。上下へ無限に伸びた壁として使う。橋の手すりと同じ考え方）
// ============================================================

// 作業台（workspace/gondeer.html）で整えた配置。パーツごとの、gondeer の原点から見た 4x4 行列と色
// 並びは kummo の中のメッシュ（体・十二面体・左の目・右の目・口）、ティアラ 右（帯・とげ 1〜5）、ティアラ 左（帯・とげ 1〜5）の順
export const GONDEER_LAYOUT = [
  { color: '#b78f62', m: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] },                                                               // 体
  { color: '#a47f4c', m: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] },                                                               // 十二面体
  { color: '#111111', m: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] },                                                               // 左の目
  { color: '#111111', m: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] },                                                               // 右の目
  { color: '#c12525', m: [0.28736,0,0,0, 0,-0.1436,0.34865,0, 0,-0.07235,-0.0298,0, 0,0.15057,1.51517,1] },                       // 口
  { color: '#efd4af', m: [0.45736,0.1401,-2.4373,0, -1.10707,4.13734,0.03263,0, 1.52983,0.39204,0.30963,0, 0.33723,0.08225,-0.08907,1] },     // 帯 右
  { color: '#efd4af', m: [0.93349,0.02668,-1.12399,0, -0.38142,2.49389,-0.54991,0, 0.58483,0.17988,0.597,0, 0.71461,0.33857,0.6009,1] },      // とげ 右1
  { color: '#efd4af', m: [0.736,0.10129,-1.5042,0, -0.57779,2.83107,-0.20368,0, 0.65656,0.15446,0.38726,0, 0.88519,0.25052,0.34025,1] },      // とげ 右2
  { color: '#efd4af', m: [0.32622,0.09836,-1.73651,0, -0.5081,2.20525,0.02945,0, 0.90122,0.20523,0.18092,0, 0.98791,0.21749,0.03596,1] },     // とげ 右3
  { color: '#efd4af', m: [-0.13834,0.08802,-1.83942,0, -0.66833,2.86331,0.28679,0, 0.80369,0.19162,-0.10351,0, 1.00161,0.26637,-0.29079,1] }, // とげ 右4
  { color: '#efd4af', m: [-0.5569,0.04996,-1.7176,0, -0.91194,3.50183,0.61584,0, 0.59697,0.17622,-0.2589,0, 0.9775,0.2622,-0.60008,1] },      // とげ 右5
  { color: '#efd4af', m: [0.45736,-0.1401,2.4373,0, 1.10707,4.13734,0.03263,0, -1.52983,0.39204,0.30963,0, -0.33723,0.08225,-0.08907,1] },    // 帯 左
  { color: '#efd4af', m: [-0.5569,-0.04996,1.7176,0, 0.91194,3.50183,0.61584,0, -0.59697,0.17622,-0.2589,0, -0.9775,0.2622,-0.60008,1] },     // とげ 左1
  { color: '#efd4af', m: [-0.13834,-0.08802,1.83942,0, 0.66833,2.86331,0.28679,0, -0.80369,0.19162,-0.10351,0, -1.00161,0.26637,-0.29079,1] },// とげ 左2
  { color: '#efd4af', m: [0.32622,-0.09836,1.73651,0, 0.5081,2.20525,0.02945,0, -0.90122,0.20523,0.18092,0, -0.98791,0.21749,0.03596,1] },    // とげ 左3
  { color: '#efd4af', m: [0.736,-0.10129,1.5042,0, 0.57779,2.83107,-0.20368,0, -0.65656,0.15446,0.38726,0, -0.88519,0.25052,0.34025,1] },     // とげ 左4
  { color: '#efd4af', m: [0.93349,-0.02668,1.12399,0, 0.38142,2.49389,-0.54991,0, -0.58483,0.17988,0.597,0, -0.71461,0.33857,0.6009,1] },     // とげ 左5
];

// ティアラの形（作業台と同じ。帯=前半分だけの半円で原点=底の中心、とげ=先を平らに切り落とした四角錐で原点=根元）
const TIARA_R = 0.42, BAND_H = 0.07, TIP_R = 0.02;
const SPIKE_H = [0.13, 0.2, 0.3, 0.2, 0.13];
function tiaraGeometries() {
  const band = new THREE.CylinderGeometry(TIARA_R, TIARA_R * 1.04, BAND_H, 12, 1, true, -Math.PI / 2, Math.PI); band.translate(0, BAND_H / 2, 0);
  const spikes = SPIKE_H.map(h => { const g = new THREE.CylinderGeometry(TIP_R, 0.055, h, 4); g.translate(0, h / 2, 0); return g; });
  return [band, ...spikes];
}

export function createGondeer() {
  const group = new THREE.Group();
  group.name = 'gondeer';
  const kummoGeos = [];
  createKummo().traverse(o => { if (o.isMesh) kummoGeos.push(o.geometry); });
  const mats = {};
  const matOf = (color, side = THREE.FrontSide) => mats[color + side] ??= new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 30, side });
  const meshes = kummoGeos.map((g, i) => {
    g.applyMatrix4(new THREE.Matrix4().fromArray(GONDOLA_LAYOUT[i].m));
    g.applyMatrix4(new THREE.Matrix4().fromArray(GONDEER_LAYOUT[i].m));
    const mesh = new THREE.Mesh(g, matOf(GONDEER_LAYOUT[i].color));
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  });
  // ティアラ 2 つ（12 パーツ）を 1 つのメッシュに（帯は裏も見えるので両面）
  const tiaraGeos = [...tiaraGeometries(), ...tiaraGeometries()].map((g, i) => {
    g.applyMatrix4(new THREE.Matrix4().fromArray(GONDEER_LAYOUT[5 + i].m));
    return g.index ? g.toNonIndexed() : g;
  });
  const tiara = new THREE.Mesh(mergeGeometries(tiaraGeos), matOf(GONDEER_LAYOUT[5].color, THREE.DoubleSide));
  tiara.name = 'tiara';
  tiara.castShadow = true;
  group.add(tiara);
  // 当たり判定：帯の高さの真ん中を通る半円を WALL_SEG 本の線分に分け、作業台の配置で動かして XZ に落とす
  const WALL_SEG = 8;
  const walls = [];
  for (const k of [5, 11]) {
    const mat = new THREE.Matrix4().fromArray(GONDEER_LAYOUT[k].m);
    const pts = [];
    for (let i = 0; i <= WALL_SEG; i++) {
      const a = -Math.PI / 2 + Math.PI * i / WALL_SEG;
      pts.push(new THREE.Vector3(Math.sin(a) * TIARA_R * 1.02, BAND_H / 2, Math.cos(a) * TIARA_R * 1.02).applyMatrix4(mat));
    }
    for (let i = 0; i < WALL_SEG; i++) walls.push([pts[i].x, pts[i].z, pts[i + 1].x, pts[i + 1].z]);
  }
  group.userData.walls = walls;
  group.userData.walkable = [meshes[0], meshes[1]];
  group.userData.bodyBox = new THREE.Box3().setFromObject(meshes[0]).union(new THREE.Box3().setFromObject(meshes[1]));
  return group;
}
