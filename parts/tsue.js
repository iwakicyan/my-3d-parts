import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================================
//  杖 — 手描きスケッチから作業台 workspace/tsue.html で形を整えた杖。輪郭線なし
//  createTsue({ height })
//    原点=柄の下の端・+y が上・+z が正面。葉は左（-x）に 1 枚だけ（ほかは x=0 で左右対称）。height (m) を渡すとその高さに縮める（渡さなければモデル単位。高さ TSUE_HEIGHT）
//    柄（茶）・玉（白）・枠（白い管の水平な六角形。外と内）・芯（白いつむ形）・らせん（白）・葉 1 枚（茶。左だけ）と葉の青
//    動かないので、全部を 1 つのメッシュにまとめる（色は頂点の色。自発光も頂点の色 × glow でスケッチのような平たい色）
// ============================================================

export const TSUE = { GLOW: 0.45 };

// 作業台で整えた配置。パーツごとの、杖の原点から見た 4x4 行列と色（ジオメトリは下の tsueGeometries と同じ形）
export const TSUE_LAYOUT = {
  '柄':         { color: '#7d726b', m: [1.01835,0,0,0, 0,0.92958,0,0, 0,0,1.00705,0, 0,0,0,1] },
  '玉':         { color: '#f2f4f5', m: [1.24986,0,0,0, 0,1.3248,0,0, 0,0,1.35476,0, -0.00335,7.21816,0,1] },
  '枠':         { color: '#f2f4f5', m: [0.65982,0,0,0, 0,0.94407,0,0, 0,0,0.74507,0, 0,7.62481,0,1] },
  '枠（内）':   { color: '#f2f4f5', m: [0.70732,0,0,0, 0,1,0,0, 0,0,0.78123,0, 0,7.51632,0,1] },
  '芯':         { color: '#f2f4f5', m: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,4.88,0,1] },
  'らせん':     { color: '#f2f4f5', m: [0.64613,0,0,0, 0,0.82292,0,0, 0,0,0.69678,0, 0,4.88,0.01031,1] },
  '葉（左）':   { color: '#7d726b', m: [1.10065,-0.62778,-0.03132,0, 0.00607,-0.0755,1.38671,0, -1.06206,-1.88507,-0.10142,0, -0.53887,6.24619,0,1] },
  '葉の青（左）': { color: '#8ee8f8', m: [1.13179,-0.55722,-0.00018,0, -0.04221,-0.13204,1.04334,0, -0.89916,-1.9109,-0.28629,0, -0.59103,6.12844,-0.01312,1] },
};

// 作業台と同じ形（各パーツの原点で作ったジオメトリ。置き場所は TSUE_LAYOUT）
const S = 0.008;   // スケッチの画素 → モデル単位
function tsueGeometries() {
  const g = {};
  { const top = (1230 - 285) * S, r = 17 * S; g['柄'] = new THREE.CylinderGeometry(r, r, top, 5).translate(0, top / 2, 0); }
  g['玉'] = new THREE.SphereGeometry(35 * S, 6, 4);
  const hexFrame = (rx, rz) => {
    const BOW = 0.12, pts = [];
    for (let k = 0; k < 6; k++) {
      const a0 = k * Math.PI / 3, a1 = (k + 1) * Math.PI / 3;
      const c0 = new THREE.Vector3(rx * Math.cos(a0), 0, rz * Math.sin(a0));
      const c1 = new THREE.Vector3(rx * Math.cos(a1), 0, rz * Math.sin(a1));
      pts.push(c0, c0.clone().add(c1).multiplyScalar(0.5 * (1 - BOW)));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.2), 48, 11 * S, 4, true);
  };
  g['枠'] = hexFrame(245 * S, 210 * S);
  g['枠（内）'] = hexFrame(245 * S * 0.7, 210 * S * 0.7);
  {
    const H = (770 - 470) * S, R = 48 * S, pts = [];
    for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push(new THREE.Vector2(Math.max(0.001, R * Math.sin(Math.PI * t)), (t - 0.5) * H)); }
    g['芯'] = new THREE.LatheGeometry(pts, 6);
  }
  {
    const TURNS = 5.5, H = (770 - 470) * S, TILT = 0.35, pts = [];
    const R = t => Math.max(30 * S, 48 * S * Math.sin(Math.PI * t) + 22 * S);
    const N = Math.round(TURNS * 12);
    for (let i = 0; i <= N; i++) {
      const t = i / N, a = t * TURNS * Math.PI * 2;
      const x = R(t) * Math.cos(a), z = R(t) * Math.sin(a);
      pts.push(new THREE.Vector3(x, (0.5 - t) * H + x * TILT, z));
    }
    g['らせん'] = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N, 11 * S, 4, false);
  }
  for (const side of ['左']) {   // 葉は左（-x）の 1 枚だけ
    g['葉（' + side + '）'] = new THREE.SphereGeometry(1, 8, 5);
    g['葉の青（' + side + '）'] = new THREE.SphereGeometry(1, 8, 5);
  }
  return g;
}

// 頂点の色を塗り、まとめられるよう属性を position・normal・color にそろえる
function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
  const n = g.getAttribute('position').count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) color.toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

// 葉の形の大きさ（作業台では SphereGeometry(1) を scale していた分。行列には入っていない）
const LEAF_SCALE = { '葉': [80 * S, 24 * S, 12 * S], '葉の青': [48 * S, 24 * S, 8 * S] };

export const TSUE_HEIGHT = (() => {
  const box = new THREE.Box3();
  const geos = tsueGeometries();
  for (const [name, geo] of Object.entries(geos)) {
    const sc = LEAF_SCALE[name.replace(/（.）$/, '')];
    if (sc) geo.scale(...sc);
    geo.applyMatrix4(new THREE.Matrix4().fromArray(TSUE_LAYOUT[name].m));
    geo.computeBoundingBox(); box.union(geo.boundingBox);
  }
  return box.max.y;
})();

export function createTsue({ height = null, glow = TSUE.GLOW } = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow, glow, glow) });
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;');
  };
  const parts = [];
  for (const [name, geo] of Object.entries(tsueGeometries())) {
    const sc = LEAF_SCALE[name.replace(/（.）$/, '')];
    if (sc) geo.scale(...sc);
    const { color, m } = TSUE_LAYOUT[name];
    parts.push(paint(geo.applyMatrix4(new THREE.Matrix4().fromArray(m)), new THREE.Color(color)));
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts), mat);
  mesh.name = '杖'; mesh.castShadow = true;
  const root = new THREE.Group(); root.name = 'tsue';
  root.add(mesh);
  if (height) root.scale.setScalar(height / TSUE_HEIGHT);
  return root;
}
