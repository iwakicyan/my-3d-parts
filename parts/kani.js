import * as THREE from 'three';

// ============================================================
//  ローポリのカニ（workspace/kani.html で組んだもの）
//    体（屋根のように上を持ち上げた直方体）・目 2 つ（柄と玉）・はさみ 2 つ（はさみと上の指・下の指の三角錐）・あし先 4 本（三角錐）
//    作業台で確定した配置（KANI_LAYOUT。パーツごとの形・4x4 行列・色・動かした頂点）を焼き込む。輪郭線なし
//    原点=いちばん下の真ん中・+z が正面（はさみの向き）・height で全体の高さ[m]（モデル単位の高さ KANI_HEIGHT）
//  動き（createKaniMotion）：作業台の ▶ 歩く・✌ チョキチョキと同じ
//    縦歩き：横ではなく前（+z）へ歩く。あし先の組（KANI_RIG.step）を交互に、付け根を通る縦の軸まわりに前後へ振り、前へ出すときだけ持ち上げる。体は 1 歩ごとに上下
//    チョキチョキ：はさみ（KANI_RIG.arms）を前に持ち上げて少し外へ開き、上・後ろへずらして、指を開いて閉じる
//    指は歩いている間もチョキチョキする
// ============================================================

// 形：box / cyl / spike（先細りの三角錐。底は半径 r の三角形、長さ h。dir の向きにとがる）
const GEO = {
  '体': ['box', 3, 1.2, 2.2, 2, 1, 2],
  '目の柄': ['cyl', 0.08, 0.6, 5],
  '目': ['box', 0.25, 0.25, 0.25],
  'はさみ': ['box', 0.7, 0.6, 0.5],
  '上の指': ['spike', 0.14, 0.7, 'z'],
  '下の指': ['spike', 0.12, 0.6, 'z'],
  'あし先': ['spike', 0.13, 0.9, '-y'],
};
const geoKind = name => name.replace(/\d*(左|右)$/, '');

// 作業台で確定した配置（パーツの、カニの原点（作業台の原点）から見た 4x4 行列（列ごと）・色・動かした頂点 [番号, x, y, z]）
export const KANI_LAYOUT = [
  { key: '体', color: '#e0503a', m: [1,0,0,0,0,1,0,0,0,0,0.7406,0,0,0,0,1],
    verts: [[0,1.0093,0.6,1.1],[1,1.5,1.0902,0],[2,1.0093,0.6,-1.1],[3,1.0093,-0.6,1.1],[5,1.0093,-0.6,-1.1],[6,-1.0093,0.6,-1.1],[7,-1.5,1.0902,0],[8,-1.0093,0.6,1.1],[9,-1.0093,-0.6,-1.1],[11,-1.0093,-0.6,1.1],[12,-1.0093,0.6,-1.1],[14,1.0093,0.6,-1.1],[15,-1.5,1.0902,0],[16,0,1.0902,0],[17,1.5,1.0902,0],[18,-1.0093,0.6,1.1],[20,1.0093,0.6,1.1],[21,-1.0093,-0.6,1.1],[23,1.0093,-0.6,1.1],[27,-1.0093,-0.6,-1.1],[29,1.0093,-0.6,-1.1],[30,-1.0093,0.6,1.1],[32,1.0093,0.6,1.1],[33,-1.0093,-0.6,1.1],[35,1.0093,-0.6,1.1],[36,1.0093,0.6,-1.1],[38,-1.0093,0.6,-1.1],[39,1.0093,-0.6,-1.1],[41,-1.0093,-0.6,-1.1]] },
  { key: '目の柄左', color: '#b03a2a', m: [1,0,0,0,0,1,0,0,0,0,1,0,0.45,0.7979,0.3302,1] },
  { key: '目左', color: '#222222', m: [1.2861,-0.258,-0.1184,0,0.1201,0.4945,0.227,0,0,-0.4171,0.9089,0,0.45,1.1479,0.3302,1] },
  { key: '目の柄右', color: '#b03a2a', m: [1,0,0,0,0,1,0,0,0,0,1,0,-0.45,0.7979,0.3302,1] },
  { key: '目右', color: '#222222', m: [1.2861,0.258,0.1184,0,-0.1201,0.4945,0.227,0,0,-0.4171,0.9089,0,-0.45,1.1479,0.3302,1] },
  { key: 'はさみ左', color: '#e0503a', m: [0.8172,-0.8938,-0.1998,0,0.2139,0.4565,-1.1676,0,0.8284,0.6653,0.4119,0,1.4109,0.6477,0.5425,1] },
  { key: '上の指左', color: '#e0503a', m: [1.8383,-1.7909,-0.0207,0,0.3707,0.4106,-2.6108,0,0.7793,0.7972,0.236,0,1.7837,1.2131,0.6287,1] },
  { key: '下の指左', color: '#b03a2a', m: [1.5086,-0.345,-2.0737,0,-0.822,2.3173,-0.9835,0,0.8556,0.5302,0.5342,0,1.8922,0.7512,0.8857,1] },
  { key: 'はさみ右', color: '#e0503a', m: [0.8172,0.8938,0.1998,0,-0.2139,0.4565,-1.1676,0,-0.8284,0.6653,0.4119,0,-1.4109,0.6477,0.5425,1] },
  { key: '上の指右', color: '#e0503a', m: [1.8383,1.7909,0.0207,0,-0.3707,0.4106,-2.6108,0,-0.7793,0.7972,0.236,0,-1.7837,1.2131,0.6287,1] },
  { key: '下の指右', color: '#b03a2a', m: [1.5041,0.3453,2.08,0,0.8296,2.3168,-0.9847,0,-0.8577,0.533,0.5317,0,-1.8922,0.7512,0.8857,1] },
  { key: 'あし先3左', color: '#b03a2a', m: [3.3877,1.9174,-0.8848,0,-0.6787,1.0343,-0.3572,0,0.1076,0.8459,2.2452,0,1.4496,-0.8626,0.6221,1] },
  { key: 'あし先1右', color: '#b03a2a', m: [3.3785,-1.8685,-0.6987,0,0.652,1.0647,0.3054,0,0.0821,-0.7041,2.2797,0,-1.4438,-0.9139,-0.5134,1] },
  { key: 'あし先3右', color: '#b03a2a', m: [3.3671,-1.8225,0.8221,0,0.6519,1.0502,-0.3418,0,-0.1146,0.8038,2.2513,0,-1.4496,-0.8626,0.6221,1] },
  { key: 'あし先1左', color: '#b03a2a', m: [3.4003,1.9677,0.7524,0,-0.6783,1.0499,0.3194,0,-0.0749,-0.7405,2.2751,0,1.4438,-0.9139,-0.5134,1] },
];

// 動かす組（作業台のグループ）
export const KANI_RIG = {
  step: [['あし先3左', 'あし先1右'], ['あし先3右', 'あし先1左']],   // 交互に踏み出す（作業台のグループ8・グループ9）
  arms: [['はさみ左', '上の指左', '下の指左'], ['はさみ右', '上の指右', '下の指右']],   // 持ち上げるはさみ（グループ7・グループ7'）
};

// 動きの数値（作業台の MOTION と同じ）
export const KANI_MOTION = {
  RATE: 0.9,                  // 1 秒に歩く周期の数
  SWING: 22 * Math.PI / 180,  // あしを前後に振る角度[rad]
  LIFT: 14 * Math.PI / 180,   // あしを持ち上げる角度[rad]
  BOB: 0.06,                  // 体の上下（モデル単位）
  REACH: 1.4,                 // 付け根からあし先までの長さ（進む速さの見積もり用・モデル単位）
  SNIP_RATE: 1.6,             // 歩いているときのチョキチョキ[回/秒]
  SNIP: 18 * Math.PI / 180,   // 指を開く角度[rad]
  ARM_RAISE: 30 * Math.PI / 180,   // はさみを前に持ち上げる角度[rad]
  ARM_OUT: 15 * Math.PI / 180,     // 外へ開く角度[rad]
  ARM_SHIFT: [0, 0.2, -0.2],       // 持ち上げるときにずらす量（モデル単位。上へ・後ろへ）
  ARM_PIVOT_FWD: 0.25,             // 回す軸の前後の位置（はさみのいちばん後ろ = 0、いちばん前 = 1）
  ARM_SNIP_RATE: 2.4,              // はさみを上げているときのチョキチョキ[回/秒]
  EASE: 0.5,                       // 動きの入り・切りにかける時間[秒]
};

function makeGeo(key) {
  const [kind, a, b, c, d, e, f] = GEO[geoKind(key)];
  if (kind === 'box') return new THREE.BoxGeometry(a, b, c, d || 1, e || 1, f || 1);
  if (kind === 'cyl') return new THREE.CylinderGeometry(a, a, b, c);
  const g = new THREE.ConeGeometry(a, b, 3);
  if (c === 'z') g.rotateX(Math.PI / 2); else if (c === '-y') g.rotateX(Math.PI);
  return g;
}

// 作業台の原点から見た全体の箱（原点を下の真ん中へ寄せる・高さを合わせる用）
const _box = (() => {
  const box = new THREE.Box3();
  for (const p of KANI_LAYOUT) { const g = partGeo(p); g.applyMatrix4(new THREE.Matrix4().fromArray(p.m)); g.computeBoundingBox(); box.union(g.boundingBox); g.dispose(); }
  return box;
})();
function partGeo(p) {
  const g = makeGeo(p.key);
  if (p.verts) { const pa = g.attributes.position; for (const [i, x, y, z] of p.verts) pa.setXYZ(i, x, y, z); g.computeVertexNormals(); }
  return g;
}
export const KANI_HEIGHT = _box.max.y - _box.min.y;

// root（原点=いちばん下の真ん中・height[m] の大きさ）→ userData.body（作業台の原点の座標。歩くと上下する）→ パーツ（はさみ 2 つは userData.arms のグループの中）
export function createKani({ height = KANI_HEIGHT } = {}) {
  const root = new THREE.Group(); root.name = 'カニ';
  root.scale.setScalar(height / KANI_HEIGHT);
  const body = new THREE.Group(); body.name = 'カニの体';
  body.position.set(-(_box.min.x + _box.max.x) / 2, -_box.min.y, -(_box.min.z + _box.max.z) / 2);
  root.add(body);
  const mats = {};
  const matOf = color => mats[color] ??= new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 30 });
  const parts = {};
  const arms = KANI_RIG.arms.map((keys, i) => { const g = new THREE.Group(); g.name = 'はさみの組' + (i ? '右' : '左'); body.add(g); return { g, keys }; });
  for (const p of KANI_LAYOUT) {
    const mesh = new THREE.Mesh(partGeo(p), matOf(p.color));
    mesh.name = p.key; mesh.castShadow = true;
    new THREE.Matrix4().fromArray(p.m).decompose(mesh.position, mesh.quaternion, mesh.scale);
    const arm = arms.find(a => a.keys.includes(p.key));
    (arm ? arm.g : body).add(mesh);
    parts[p.key] = mesh;
  }
  root.userData.body = body;
  root.userData.parts = parts;
  root.userData.arms = arms.map(a => a.g);
  return root;
}

// 動き：update(dt, { walk, snip }) を毎フレーム（walk・snip は入れるかどうか。入り・切りは EASE 秒でなめらかに変わる）
//   返り値は前（+z）へ進む速さ[m/s]（root の大きさを掛けたもの。歩いた分だけ root を前へ動かす用）
export function createKaniMotion(root, M = KANI_MOTION) {
  const { body, parts, arms } = root.userData;
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const keep = m => ({ m, L0: m.matrix.clone() });
  root.updateMatrixWorld(true);   // パーツの matrix を position・quaternion・scale に合わせる
  const bbOf = m => { const g = m.geometry; g.computeBoundingBox(); return g.boundingBox; };
  // あし：付け根はあし先の上の端
  const legs = [];
  KANI_RIG.step.forEach((keys, gi) => keys.forEach(k => {
    const m = parts[k]; if (!m) return;
    const bb = bbOf(m), c = bb.getCenter(new THREE.Vector3());
    const hip = new THREE.Vector3(c.x, bb.max.y, c.z).applyMatrix4(m.matrix);
    legs.push({ ...keep(m), hip, side: hip.x >= 0 ? 1 : -1, phase: gi * Math.PI });
  }));
  // はさみ：体に近い端の少し前が軸（作業台の原点の座標で x が 0 に近いほう・z は後ろから ARM_PIVOT_FWD の割合・y はまんなか）
  const armRig = arms.map(g => {
    const box = new THREE.Box3();
    g.children.forEach(m => { const b = bbOf(m).clone().applyMatrix4(m.matrix); box.union(b); });
    const c = box.getCenter(new THREE.Vector3());
    const x = Math.abs(box.min.x) < Math.abs(box.max.x) ? box.min.x : box.max.x;
    return { g, side: c.x >= 0 ? 1 : -1, pivot: new THREE.Vector3(x, c.y, box.min.z + (box.max.z - box.min.z) * M.ARM_PIVOT_FWD) };
  });
  // 指：付け根（とがっていない後ろの端）を通る左右の軸まわり。上の指は上へ、下の指は下へ開く
  const fingers = [];
  for (const [k, m] of Object.entries(parts)) {
    const f = k.match(/^(上|下)の指/); if (!f) continue;
    const bb = bbOf(m), c = bb.getCenter(new THREE.Vector3());
    fingers.push({ ...keep(m), dir: f[1] === '上' ? -1 : 1, pivot: new THREE.Vector3(c.x, c.y, bb.min.z).applyMatrix4(m.matrix) });
  }
  const body0 = body.position.clone();
  const shift = new THREE.Vector3(...M.ARM_SHIFT);
  const _R = new THREE.Matrix4(), _R2 = new THREE.Matrix4(), _T = new THREE.Matrix4(), _Ti = new THREE.Matrix4(), _M = new THREE.Matrix4();
  const rotAbout = (obj, L0, p, rots, add) => {
    _T.makeTranslation(p.x, p.y, p.z); _Ti.makeTranslation(-p.x, -p.y, -p.z);
    _M.copy(_T); rots.forEach(r => _M.multiply(r)); _M.multiply(_Ti);
    if (L0) _M.multiply(L0);
    _M.decompose(obj.position, obj.quaternion, obj.scale);
    if (add) obj.position.add(add);
  };
  let w = 0, s = 0, walkPh = 0, snipPh = 0;
  const _sh = new THREE.Vector3();
  const smooth = t => t * t * (3 - 2 * t);
  function update(dt, { walk = false, snip = false } = {}) {
    const step = dt / M.EASE;
    w = walk ? Math.min(1, w + step) : Math.max(0, w - step);
    s = snip ? Math.min(1, s + step) : Math.max(0, s - step);
    walkPh += dt * 2 * Math.PI * M.RATE * (w > 0 ? 1 : 0);
    const kw = smooth(w), ks = smooth(s);
    // 縦歩き
    legs.forEach(p => {
      const th = walkPh + p.phase;
      _R.makeRotationAxis(Y, -p.side * M.SWING * kw * Math.sin(th));
      _R2.makeRotationAxis(Z, p.side * M.LIFT * kw * Math.max(0, Math.cos(th)));
      rotAbout(p.m, p.L0, p.hip, [_R, _R2]);
    });
    body.position.set(body0.x, body0.y + M.BOB * kw * Math.abs(Math.sin(walkPh)), body0.z);
    // はさみを持ち上げる
    armRig.forEach(a => {
      _R.makeRotationAxis(Z, a.side * M.ARM_OUT * ks);
      _R2.makeRotationAxis(X, -M.ARM_RAISE * ks);
      rotAbout(a.g, null, a.pivot, [_R, _R2], _sh.copy(shift).multiplyScalar(ks));
    });
    // 指のチョキチョキ（はさみを上げているほど速く・大きく）
    const amp = Math.max(kw, ks);
    snipPh += dt * 2 * Math.PI * (M.SNIP_RATE + (M.ARM_SNIP_RATE - M.SNIP_RATE) * ks) * (amp > 0 ? 1 : 0);
    const open = M.SNIP * amp * (0.5 - 0.5 * Math.cos(snipPh));
    fingers.forEach(f => { _R.makeRotationAxis(X, f.dir * open); rotAbout(f.m, f.L0, f.pivot, [_R]); });
    // 地面についているあしが後ろへ押す速さ
    return M.REACH * M.SWING * 2 * Math.PI * M.RATE * (2 / Math.PI) * kw * root.scale.x;
  }
  return { update };
}
