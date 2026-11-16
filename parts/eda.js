import * as THREE from 'three';
import { mergeStatic } from './mergeStatic.js';

// ============================================================
//  枝 — 手描きスケッチから。先細りの四角柱の枝が平たく広がった束。輪郭線なし
//  形は計算で作る（乱数のシードで決まる。作業台 workspace/eda.html と同じ形）
//
//  createEda({ scale, seed })
//    原点=束の中心・枝は xy 面に広がる・+z が正面。scale で全体を拡大（モデル単位で主枝の長さ EDA.R くらい）
//    動かないので全部を 1 つのメッシュにまとめる
//    userData.perches: 主枝ごとに PERCH_TS の所のとまり場所 [{ pos, along, thick, set }]（root の座標。pos は -z 側の面の上、along は主枝の伸びる向き、thick は太い主枝か、set は PERCH_TS の組の番号（脇枝は SIDE_SET）、from は脇枝の根元＝親の枝の上の点（脇枝だけ））
//  createEdaParts({ seed })
//    作業台用。主枝ごとに（脇枝・先の二股ごと）1 メッシュに分けたグループ。名前は 主枝1〜
// ============================================================

export const EDA = {
  SEED: 1,
  R: 5,                  // 主枝の長さのめやす
  ARMS: 6,               // 1 束の主枝の本数
  W_MAIN: [0.42, 0.22],  // 主枝の根元の太さ（太い・細い）。太いのは 2〜3 本
  TAPER: 0.45,           // 枝の先の太さ（根元に対する割合）
  CHILD_W: [0.5, 0.7],   // 脇枝の根元の太さ（出る所の親の太さに対する割合）
  MIN_W: 0.07,           // これより細くなる枝は出さない
  DEPTH: 3,              // 枝分かれの段数
  BEND: 0.06,            // 1 区間ごとの曲がりのばらつき (rad)
  SEG: 0.18,             // 区間の長さ
  FORK: 0.6,             // 先が二股になる確率
  // とまり場所：主枝ごとに、根元からこの割合の所。組（set）ごとに分けてあり、userData.perches の set に組の番号が入る
  PERCH_TS: [
    [0.2, 0.35, 0.5, 0.65, 0.8],     // 組 0
    [0.275, 0.425, 0.575, 0.725],    // 組 1（組 0 のあいだ）
  ],
  SIDE_SET: 2,           // 脇枝・先の二股のとまり場所の組の番号
  SIDE_TS: [0.6, 0.9],   // 脇枝・先の二股の、根元からこの割合の所（親の枝から離す）
  SIDE_MIN_LEN: 0.8,     // これより短い脇枝にはとまらない
  PERCH_GAP: 0.3,        // 脇枝のとまり場所は、ほかのとまり場所からこれより近ければ外す
  COLOR: 0x68757a,
  SHADE: false,          // false: 光を受けず陰影なしの平たい色 / true: 光を受けて陰影がつく
  GLOW: 0.45,            // SHADE のときの自発光（色に対する割合）
};

// 束ごとの主枝の芯の位置・太さ・頂点・面を作る。返すのは [{ name, z, P, I }]
function edaGeometryData(seed) {
  const E = EDA;
  let s = (seed >>> 0) || 1;   // 決まった乱数（mulberry32）
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rr = (a, b) => a + (b - a) * rnd();

  // 枝 1 本の芯線（点・向き・太さ）。少しずつ曲がる
  function spine(x, y, ang, len, w0, w1) {
    const n = Math.max(2, Math.round(len / E.SEG)), pts = [];
    let a = ang;
    for (let i = 0; i <= n; i++) {
      pts.push({ x, y, a, w: w0 + (w1 - w0) * i / n });
      a += rr(-E.BEND, E.BEND); x += Math.cos(a) * len / n; y += Math.sin(a) * len / n;
    }
    return pts;
  }
  // 芯線から先細りの四角柱（断面は正方形・一辺=太さ）。両端にふた
  function prism(pts, P, I) {
    const base = P.length / 3;
    pts.forEach((p, i) => {
      const q = pts[Math.min(i + 1, pts.length - 1)], o = pts[Math.max(i - 1, 0)];
      const dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, h = p.w / 2;
      // 角 4 つ：(+n,+z) (-n,+z) (-n,-z) (+n,-z)
      P.push(p.x + nx * h, p.y + ny * h, h, p.x - nx * h, p.y - ny * h, h, p.x - nx * h, p.y - ny * h, -h, p.x + nx * h, p.y + ny * h, -h);
    });
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 4, b = a + 4;
      for (let k = 0; k < 4; k++) { const k1 = (k + 1) % 4; I.push(a + k, b + k1, b + k, a + k, a + k1, b + k1); }
    }
    const f = base, e = base + (pts.length - 1) * 4;
    I.push(f, f + 2, f + 1, f, f + 3, f + 2, e, e + 1, e + 2, e, e + 2, e + 3);
  }
  // 枝を伸ばし、脇枝と先の二股を出す
  function grow(x, y, ang, len, w0, depth, P, I) {
    const pts = spine(x, y, ang, len, w0, w0 * E.TAPER);
    prism(pts, P, I);
    if (depth === 1) sideSpines.push({ pts, len });   // 脇枝・先の二股のとまり場所の候補（乱数は使わない）
    if (depth >= E.DEPTH) return;
    // 脇枝：左右交互
    const nSide = depth === 0 ? Math.round(rr(1, 3)) : Math.round(rr(0, 2));
    let side = rnd() < 0.5 ? 1 : -1;
    for (let k = 0; k < nSide; k++) {
      const t = rr(0.25, 0.8) * (k + 1) / nSide + 0.1, p = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
      const w = p.w * rr(...E.CHILD_W);
      if (w >= E.MIN_W) grow(p.x, p.y, p.a + side * rr(0.55, 1.0), len * rr(0.3, 0.5), w, depth + 1, P, I);
      side = -side;
    }
    // 先の二股（Y 字）
    if (rnd() < E.FORK) {
      const p = pts[pts.length - 1], w = p.w * 0.85;
      if (w >= E.MIN_W) for (const sg of [1, -1]) grow(p.x, p.y, p.a + sg * rr(0.3, 0.6), len * rr(0.22, 0.38), w, depth + 1, P, I);
    }
  }
  // 1 束（主枝 ARMS 本と、それぞれの脇枝・二股の先）。z は束の奥行きの位置、ws は太さ・ls は長さの倍率
  const out = [];
  let sideSpines = [];
  function bundle(prefix, z, ws, ls) {
    const a0 = rnd() * Math.PI * 2;
    const thick = new Set(); while (thick.size < (rnd() < 0.5 ? 2 : 3)) thick.add(Math.floor(rnd() * E.ARMS));
    for (let i = 0; i < E.ARMS; i++) {
      const P = [], I = [], isThick = thick.has(i);
      const ang = a0 + i * Math.PI * 2 / E.ARMS + rr(-0.2, 0.2);
      const len = E.R * ls * (isThick ? rr(0.85, 1.05) : rr(0.6, 0.85));
      const w0 = (isThick ? E.W_MAIN[0] : E.W_MAIN[1]) * ws;
      const first = P.length;
      sideSpines = [];
      grow(0, 0, ang, len, w0, 0, P, I);
      // とまり場所：主枝の芯の PERCH_TS の所ごとの、-z 側の面の上（主枝の頂点は 4 つずつ芯の点ごとに並んでいる）
      const n = Math.max(2, Math.round(len / E.SEG)), perches = [];
      for (const [set, ts] of E.PERCH_TS.entries()) for (const pt of ts) {
        const k = Math.round(pt * n), b = first + k * 12, q = first + Math.min(n, k + 1) * 12;
        const cx = (P[b] + P[b + 3]) / 2, cy = (P[b + 1] + P[b + 4]) / 2, h = P[b + 2];
        perches.push({ pos: new THREE.Vector3(cx, cy, z - h), along: new THREE.Vector3((P[q] + P[q + 3]) / 2 - cx, (P[q + 1] + P[q + 4]) / 2 - cy, 0).normalize(), thick: isThick, set });
      }
      // 脇枝・先の二股のとまり場所（組 SIDE_SET）：長さ SIDE_MIN_LEN 以上の枝の SIDE_TS の所。あとでほかのとまり場所と近すぎるものを外す
      for (const { pts, len: l } of sideSpines) {
        if (l < E.SIDE_MIN_LEN) continue;
        for (const st of E.SIDE_TS) {
          const p = pts[Math.round(st * (pts.length - 1))];
          perches.push({ pos: new THREE.Vector3(p.x, p.y, z - p.w / 2), along: new THREE.Vector3(Math.cos(p.a), Math.sin(p.a), 0), thick: false, set: E.SIDE_SET, side: true, from: new THREE.Vector3(pts[0].x, pts[0].y, z) });
        }
      }
      out.push({ name: prefix + (i + 1), z, P, I, perches });
    }
    // 脇枝のとまり場所は、ほかのとまり場所（主枝の分と、先に残した脇枝の分）から PERCH_GAP より近ければ外す
    const kept = [];
    for (const o of out) for (const p of o.perches) if (!p.side) kept.push(p.pos);
    for (const o of out) o.perches = o.perches.filter(p => {
      if (!p.side) return true;
      if (kept.some(q => q.distanceTo(p.pos) < E.PERCH_GAP)) return false;
      kept.push(p.pos); return true;
    });
  }
  bundle('主枝', 0, 1, 1);
  return out;
}

function edaMaterial() {
  // 光を受けない平たい色（陰影なし）。SHADE: true にすると光を受けて陰影がつく（自発光 GLOW を足す）
  if (!EDA.SHADE) return new THREE.MeshBasicMaterial({ color: EDA.COLOR });
  const m = new THREE.MeshLambertMaterial({ color: EDA.COLOR, flatShading: true });
  m.emissive.set(EDA.COLOR).multiplyScalar(EDA.GLOW);
  m.userData.emissiveK = EDA.GLOW;
  return m;
}

export function createEdaParts({ seed = EDA.SEED } = {}) {
  const root = new THREE.Group(); root.name = '枝';
  const mat = edaMaterial();
  root.userData.perches = [];
  for (const { name, z, P, I, perches } of edaGeometryData(seed)) {
    root.userData.perches.push(...perches);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setIndex(I);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat.clone()); m.name = name; m.castShadow = true;
    m.position.z = z;
    root.add(m);
  }
  return root;
}

export function createEda({ scale = 1, seed = EDA.SEED } = {}) {
  const root = new THREE.Group(); root.name = '枝';
  const inner = createEdaParts({ seed });
  const mat = edaMaterial();
  inner.traverse(o => { if (o.isMesh) o.material = mat; });
  inner.scale.setScalar(scale);
  root.add(inner);
  // とまり場所（root の座標）。pos: 太い主枝の -z 側の面の上の点、along: そこで主枝の伸びる向き
  root.userData.perches = inner.userData.perches.map(({ pos, along, thick, set, from }) => ({ pos: pos.clone().multiplyScalar(scale), along: along.clone(), thick, set, from: from?.clone().multiplyScalar(scale) }));
  mergeStatic(inner);
  // 上（-z 側）をほかの枝にふさがれているとまり場所は外す（上からレイを当てて、いちばん先に当たる面がとまり場所の面か）
  root.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(), up = new THREE.Vector3(0, 0, 1), meshes = [];
  inner.traverse(o => { if (o.isMesh) meshes.push(o); });
  root.userData.perches = root.userData.perches.filter(({ pos }) => {
    rc.set(pos.clone().add(new THREE.Vector3(0, 0, -100 * scale)), up);
    const h = rc.intersectObjects(meshes)[0];
    return h && Math.abs(h.point.z - pos.z) < 0.02 * scale;
  });
  return root;
}
