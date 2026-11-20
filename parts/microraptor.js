// ============================================================
//  microraptor — ローポリのミクロラプトル（手描きスケッチから。形と動きは workspace/microraptor.html と同じ）
//  createMicroraptor({ height, glow }): 原点 = 足の下の端（左右・前後は作業台の原点のまま）・+z が正面（くちばし）・+y が上・x=0 で左右対称
//    height: 全体の高さ [m]。null ならモデル単位のまま（高さ MICRORAPTOR_HEIGHT）
//    作業台で確定した配置（MICRORAPTOR_LAYOUT。パーツごとの 4x4 行列と色）をジオメトリに焼き込む。輪郭線なし・角ばった面のまま
//    動かす単位ごとに頂点の色のメッシュにまとめる（マテリアルは 1 つ。描画 9 回）：
//      胴と首 / 頭と目 / 尾と尾羽 / 脚・足・脚の羽（左右）/ 腕・二の腕の羽（左右）/ 翼・手の爪（左右）
//    userData.pose: 体全体（メッシュの親）。userData.pieces: { body, head, tail, leg:[-x,+x], armIn:[-x,+x], armOut:[-x,+x] }
//  createMicroraptorFlight(root): 飛ぶ動き（作業台の「▶ 飛ぶ」と同じ）
//    start(time) で飛び立ち、land(time) で着地を始め（羽ばたきを弱めて降り、足がつくとうなずいて止まる）、stop() でその場で元へ
//    update(time) を毎フレーム呼ぶ（time は秒。省略すると performance.now()）。flying / landing で今の状態
//  MICRORAPTOR_FLIGHT: 動きの数値（羽ばたきの速さ・振れ幅、体の傾き、腕と翼のひらき など）
// ============================================================
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const MICRORAPTOR = {
  GLOW: 0.45,   // 自発光（色に対する割合）。スケッチのような平たい色にする
}

export const MICRORAPTOR_FLIGHT = {
  RATE: 1.1,                    // 1 秒に羽ばたく回数
  FLAP: 40 * Math.PI / 180,     // 羽ばたきの振れ幅 [rad]
  HAND_Z: 0.6,                  // 飛んでいる間、手（爪）を肩より前（+z）へ出す距離（腕を前へ振り出す角度は形から計算）
  ARM_OPEN: 25 * Math.PI / 180, // 腕を下げる角度 [rad]
  WING_OPEN: 35 * Math.PI / 180,// 翼を手首で起こす角度 [rad]（腕と翼の間がこの 2 つの和だけひらく）
  LIFT: -5 * Math.PI / 180,     // 羽ばたきの真ん中の角度 [rad]（マイナスで下へ）
  BOB: 0.35,                    // 体が浮き沈みする幅
  PITCH: 0.45,                  // 体を前へ傾ける角度 [rad]
  LEG: 0.9,                     // 脚を後ろへ流す角度 [rad]
  LEG_SWAY: 0.08,               // 脚のゆれ [rad]
  TAIL: 0.1,                    // 尾のゆれ [rad]
  HEAD: 10 * Math.PI / 180,     // 頭（と目）を上へ仰向ける角度 [rad]
  HEAD_DROP: 0.1,               // 頭（と目）を下げる距離
  HOVER: 0.6,                   // 飛んでいる間に浮き上がる高さ
  EASE_IN: 0.6,                 // 傾き・脚が飛ぶ姿勢になるまで [秒]
  LAND: 1.1,                    // 着地にかける時間 [秒]
  TOUCH: 0.7,                   // 着地の時間のうち、降りて姿勢が戻るまでの割合（残りがうなずき）
  NOD: 0.12,                    // 着地でうなずく角度 [rad]
}

// 作業台（workspace/microraptor.html）で確定した配置。パーツ（名前#番号）ごとの、作業台の座標での 4x4 行列（列優先）と色
// 左右のあるものは #1 が -x 側、#2 が +x 側。足は #1・#2 が足、#3・#4 が手の爪（-x・+x）
export const MICRORAPTOR_LAYOUT = {
  '胴':         { color: '#4a6182', m: [0.7458,0,0,0,0,0.8094,-0.1497,0,0,0.1819,0.9833,0,0,4.3,0,1] },
  '首':         { color: '#f3f5fb', m: [0.7994,0,0,0,0,0.8655,0.5009,0,0,-0.3955,0.6835,0,0,5.9408,1.3639,1] },
  '頭':         { color: '#a4abcc', m: [1,0,0,0,0,0.5585,0.5245,0,0,-0.548,0.5835,0,0,6.9126,1.9079,1] },
  '目#1':       { color: '#101015', m: [0.8934,0,-0.4493,0,0.2007,0.8947,0.399,0,0.8008,-0.8898,1.5922,0,-0.327,6.722,2.1991,1] },
  '目#2':       { color: '#101015', m: [0.8934,0,0.4493,0,-0.2007,0.8947,0.399,0,-0.8008,-0.8898,1.5922,0,0.327,6.722,2.1991,1] },
  '脚#1':       { color: '#2b415e', m: [0.9968,0.0796,0,0,-0.0619,0.7745,-0.1316,0,-0.0133,0.1664,0.986,0,-0.4297,3.0813,-0.003,1] },
  '脚#2':       { color: '#2b415e', m: [0.9968,-0.0796,0,0,0.0619,0.7745,-0.1316,0,0.0133,0.1664,0.986,0,0.4297,3.0813,-0.003,1] },
  '足#1':       { color: '#4a6182', m: [0.9331,-0.0494,0.3562,0,0,1.5758,0.2184,0,-0.4523,-0.1611,1.1623,0,-0.2756,1.7535,0.0764,1] },
  '足#2':       { color: '#4a6182', m: [0.9331,0.0494,-0.3562,0,0,1.5758,0.2184,0,0.4523,-0.1611,1.1623,0,0.2756,1.7535,0.0764,1] },
  '足#3':       { color: '#4a6182', m: [0.6917,0.3361,0.532,0,-0.5147,0.6997,0.2271,0,-0.1906,-0.2776,0.4232,0,-2.1264,6.7389,-0.53,1] },
  '足#4':       { color: '#4a6182', m: [0.6917,-0.3361,-0.532,0,0.5147,0.6997,0.2271,0,0.1906,-0.2776,0.4232,0,2.1264,6.7389,-0.53,1] },
  '脚の羽#1':   { color: '#f3f5fb', m: [0.5926,-0.0717,-0.8023,0,-0.295,0.6886,-0.2794,0,0.6771,0.4758,0.4576,0,-0.3881,3.2705,-0.0169,1] },
  '脚の羽#2':   { color: '#f3f5fb', m: [0.5926,0.0717,0.8023,0,0.295,0.6886,-0.2794,0,-0.6771,0.4758,0.4576,0,0.3881,3.2705,-0.0169,1] },
  '腕#1':       { color: '#a4abcc', m: [1.0789,0.1872,0.4833,0,-0.1643,1.1163,-0.0655,0,-0.237,-0.0038,0.5304,0,-1.0793,5.7744,-0.0542,1] },
  '腕#2':       { color: '#a4abcc', m: [1.0789,-0.1872,-0.4833,0,0.1643,1.1163,-0.0655,0,0.237,-0.0038,0.5304,0,1.0793,5.7744,-0.0542,1] },
  '翼#1':       { color: '#f3f5fb', m: [2.6791,1.2135,-1.6182,0,-0.6754,0.9709,-0.3901,0,0.1883,0.3668,0.5868,0,-2.0425,6.9798,-0.4589,1] },
  '翼#2':       { color: '#f3f5fb', m: [2.6791,-1.2135,1.6182,0,0.6754,0.9709,-0.3901,0,-0.1883,0.3668,0.5868,0,2.0425,6.9798,-0.4589,1] },
  '二の腕の羽#1': { color: '#a4abcc', m: [0.5616,-0.003,-0.8274,0,-0.669,0.6158,-0.4563,0,0.5022,0.796,0.338,0,-1.6136,6.4865,-0.4163,1] },
  '二の腕の羽#2': { color: '#a4abcc', m: [0.5616,0.003,0.8274,0,0.669,0.6158,-0.4563,0,-0.5022,0.796,0.338,0,1.6136,6.4865,-0.4163,1] },
  '尾':         { color: '#283d58', m: [1,0,0,0,0,0.9803,0.1973,0,0,-0.1395,0.6931,0,0,4.9066,-2.2225,1] },
  '尾羽':       { color: '#a4abcc', m: [0.7743,0,0,0,0,0.8358,0.549,0,0,-0.6768,1.0303,0,0,4.7445,-2.2528,1] },
}

// ---------- パーツの形（パーツの原点で。作業台と同じ） ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z)
// a から b へ伸びる先細りの角柱。原点は真ん中
const between = (a, b, rA, rB, n) => {
  const d = b.clone().sub(a), L = d.length()
  const g = new THREE.CylinderGeometry(rB, rA, L, n)
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()))
  return g
}
// 平たい板（xy の多角形を厚み PLATE_T で押し出し、厚みの真ん中を原点に）
const PLATE_T = 0.08
const plate = pts => {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(sh, { depth: PLATE_T, bevelEnabled: false })
  g.translate(0, 0, -PLATE_T / 2); return g
}
const mirrorPts = half => [...half, ...half.slice(0, -1).reverse().map(([x, y]) => [-x, y]).slice(0, -1)]
const headGeo = () => {
  const R = 0.55, F = 1.7, B = 0.5, pos = []
  const ring = [...Array(5)].map((_, i) => { const a = i / 5 * Math.PI * 2 + Math.PI / 2; return [R * Math.cos(a), R * Math.sin(a), 0] })
  for (let i = 0; i < 5; i++) {
    const p = ring[i], q = ring[(i + 1) % 5]
    pos.push(0, 0, F, ...p, ...q)    // 前（くちばし）
    pos.push(0, 0, -B, ...q, ...p)   // 後ろ
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  return g
}
const toesGeo = () => {
  const toes = [-0.45, 0, 0.45].map(a => {
    const g = new THREE.ConeGeometry(0.11, 0.95, 4)
    g.translate(0, 0.475, 0); g.rotateX(Math.PI / 2); g.rotateY(a); return g
  })
  const g = mergeGeometries(toes); g.translate(0, 0.1, 0); return g
}
// 名前（#番号の前）と左右（-1 / 1）→ 形
const SHAPES = {
  '胴': () => new THREE.DodecahedronGeometry(1.4, 0),
  '首': () => new THREE.CylinderGeometry(0.45, 0.7, 2.8, 5),
  '頭': headGeo,
  '目': () => new THREE.IcosahedronGeometry(0.1, 0),
  '脚': s => between(V(s * 0.55, 3.4, 0), V(s * 0.5, 0.25, 0.1), 0.3, 0.12, 5),
  '足': toesGeo,
  '脚の羽': () => { const g = plate([[0,0.35],[-1.0,1.2],[-0.7,0.6],[-1.5,0.7],[-0.9,0.2],[-1.7,0],[-0.9,-0.2],[-1.5,-0.7],[-0.7,-0.6],[-1.0,-1.2],[0,-0.35]]); g.rotateY(-Math.PI / 2); return g },
  '腕': s => between(V(s * 1.0, 5.0, 0.3), V(s * 2.2, 6.6, -0.5), 0.3, 0.12, 4),
  '翼': () => { const g = plate([[0,0],[5.2,0.9],[3.7,-0.1],[4.1,-0.9],[2.8,-0.4],[3.0,-1.3],[1.8,-0.6],[1.9,-1.4],[0.8,-0.8],[0.7,-1.4],[-0.2,-0.9]]); g.rotateY(Math.PI / 2); return g },
  '二の腕の羽': () => { const g = plate([[0.075,0],[2.2,-0.2],[1.18,-0.7],[1.75,-1.12],[0.955,-1.24],[1.37,-1.8],[0,-1.62]]); g.rotateY(Math.PI / 2); return g },
  '尾': () => between(V(0, 4.1, -1.1), V(0, 4.6, -4.6), 0.32, 0.1, 5),
  '尾羽': () => { const g = plate(mirrorPts([[0,3.0],[0.35,1.9],[0.9,2.3],[0.8,1.4],[1.4,1.3],[0.95,0.6],[0.6,0.1],[0,-0.1]])); g.rotateX(-Math.PI / 2); return g },
}
// パーツ（名前#番号）の形。左右は #番号から（#1・#3 が -x、#2・#4 が +x）。作業台もこれを使う
export function microraptorPartGeo(key) {
  const [name, no] = key.split('#')
  const side = no ? (Number(no) % 2 ? -1 : 1) : 0
  return SHAPES[name](side)
}
const flatGeo = g => { const f = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(f.attributes)) if (k !== 'position') f.deleteAttribute(k); return f }

// ---------- 作業台の座標でのパーツ・動かす単位・軸 ----------
const PARTS = Object.entries(MICRORAPTOR_LAYOUT).map(([key, { color, m }]) => {
  const geo = flatGeo(microraptorPartGeo(key))
  const M = new THREE.Matrix4().fromArray(m)
  geo.computeBoundingBox()
  const box = geo.boundingBox.clone().applyMatrix4(M)
  return { key, name: key.split('#')[0], geo, M, color, box, c: box.getCenter(new THREE.Vector3()) }
})
const BOX = PARTS.reduce((b, p) => { const g = p.geo.clone().applyMatrix4(p.M); g.computeBoundingBox(); return b.union(g.boundingBox) }, new THREE.Box3())
export const MICRORAPTOR_HEIGHT = BOX.max.y - BOX.min.y   // モデル単位の高さ

const find = n => PARTS.filter(p => p.name === n)
const sideOf = p => p.c.x >= 0 ? 1 : -1
const sidePart = (n, sg) => find(n).find(p => sideOf(p) === sg)
const BODY_C = find('胴')[0].c.clone()
// 動かす単位に分ける
PARTS.forEach(p => {
  const n = p.name
  p.sign = sideOf(p)
  if (n === '腕' || n === '二の腕の羽') p.piece = 'armIn'
  else if (n === '翼' || (n === '足' && p.c.y > BODY_C.y)) p.piece = 'armOut'
  else if (n === '脚' || n === '脚の羽' || n === '足') p.piece = 'leg'
  else if (n === '尾' || n === '尾羽') p.piece = 'tail'
  else if (n === '頭' || n === '目') p.piece = 'head'
  else p.piece = 'body'
})
// 軸（作業台の座標）
const _T = new THREE.Matrix4(), _Ti = new THREE.Matrix4(), _R = new THREE.Matrix4()
const aroundPivot = (out, pv, axis, a) => {
  _R.makeRotationAxis(axis, a)
  _T.makeTranslation(pv.x, pv.y, pv.z); _Ti.makeTranslation(-pv.x, -pv.y, -pv.z)
  return out.copy(_T).multiply(_R).multiply(_Ti)
}
const shoulder = sg => { const a = sidePart('腕', sg); return V(sg > 0 ? a.box.min.x : a.box.max.x, a.box.min.y, a.c.z) }
const hip = sg => { const l = sidePart('脚', sg); return V(l.c.x, l.box.max.y, l.c.z) }
const TAIL_P = (() => { const t = find('尾')[0]; return V(0, t.c.y, t.box.max.z) })()
const HEAD_P = (() => { const h = find('頭')[0]; return V(0, h.c.y, h.box.min.z) })()
// 腕の左右ごと：肩・手首・腕と翼をひらく軸・羽ばたきの軸・前へ振り出す角度
const ARMS = [-1, 1].map(sg => {
  const F = MICRORAPTOR_FLIGHT
  const wing = sidePart('翼', sg)
  const sh = shoulder(sg), wrist = V(0, 0, 0).setFromMatrixPosition(wing.M)
  const pos = wing.geo.attributes.position, v = V(0, 0, 0), tip = V(0, 0, 0); let far = -1
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(wing.M); const d = v.distanceTo(wrist); if (d > far) { far = d; tip.copy(v) } }
  const armDir = wrist.clone().sub(sh).normalize(), wingDir = tip.sub(wrist).normalize()
  const openAxis = V(0, 0, 0).crossVectors(armDir, wingDir).normalize()   // + で腕が翼のほうへ（下へ）、- で翼が腕の延長のほうへ起きる
  const Mopen = aroundPivot(new THREE.Matrix4(), sh, openAxis, F.ARM_OPEN).multiply(aroundPivot(new THREE.Matrix4(), wrist, openAxis, -F.WING_OPEN))
  // 羽ばたきの軸：ひらいた形での翼の真ん中を肩から見た向きと、体を傾けたときの真上の両方に直角（+ で翼が上がる）
  const mid = V(0, 0, 0)
  for (let i = 0; i < pos.count; i++) mid.add(v.fromBufferAttribute(pos, i).applyMatrix4(wing.M))
  mid.divideScalar(pos.count).applyMatrix4(Mopen)
  const up = V(0, Math.cos(F.PITCH), -Math.sin(F.PITCH))
  const flapAxis = V(0, 0, 0).crossVectors(mid.sub(sh), up).normalize()
  // 前へ振り出す角度：ひらいた形での手（爪）の中心が、肩から見て HAND_Z だけ前に来るように
  let forward = 0
  const hand = PARTS.find(p => p.piece === 'armOut' && p.name === '足' && p.sign === sg)
  if (hand) {
    const h = hand.c.clone().applyMatrix4(Mopen).sub(sh)
    const dx = Math.abs(h.x), r = Math.hypot(dx, h.z)
    if (r > Math.abs(F.HAND_Z)) forward = Math.asin(F.HAND_Z / r) - Math.atan2(h.z, dx)
  }
  return { sg, sh, wrist, openAxis, flapAxis, forward }
})

// ---------- 組み立て ----------
// 足の下の端を原点へ（左右・前後は作業台の原点のまま）
const OFFSET = V(0, -BOX.min.y, 0)
let _mat = null
const sharedMat = glow => {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color(glow, glow, glow) })
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;')
  }
  return mat
}
const GEOS = (() => {   // 動かす単位ごとの形（作業台の座標。頂点の色つき・角ばった面の法線）
  const out = {}
  for (const p of PARTS) {
    const id = ['leg', 'armIn', 'armOut'].includes(p.piece) ? p.piece + (p.sign > 0 ? 1 : 0) : p.piece
    const g = p.geo.clone().applyMatrix4(p.M)
    g.computeVertexNormals()
    const c = new THREE.Color(p.color), n = g.attributes.position.count, col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    ;(out[id] ||= []).push(g)
  }
  for (const id in out) out[id] = mergeGeometries(out[id])
  return out
})()

export function createMicroraptor({ height = null, glow = MICRORAPTOR.GLOW } = {}) {
  if (!_mat || _mat.userData.glow !== glow) { _mat = sharedMat(glow); _mat.userData.glow = glow }
  const root = new THREE.Group(); root.name = 'microraptor'
  if (height) root.scale.setScalar(height / MICRORAPTOR_HEIGHT)
  const pose = new THREE.Group(); pose.name = 'pose'
  pose.position.copy(OFFSET)
  root.add(pose)
  const mesh = id => { const m = new THREE.Mesh(GEOS[id], _mat); m.name = id; m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; pose.add(m); return m }
  const pieces = {
    body: mesh('body'), head: mesh('head'), tail: mesh('tail'),
    leg: [mesh('leg0'), mesh('leg1')], armIn: [mesh('armIn0'), mesh('armIn1')], armOut: [mesh('armOut0'), mesh('armOut1')],
  }
  root.userData.pose = pose
  root.userData.pieces = pieces
  return root
}

// ---------- 飛ぶ動き ----------
const XAX = V(1, 0, 0), YAX = V(0, 1, 0)
const ease = s => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, s)))) / 2
export function createMicroraptorFlight(root) {
  const F = MICRORAPTOR_FLIGHT
  const { pose, pieces } = root.userData
  const now = () => performance.now() / 1000
  let t0 = null, land = null, k = 0
  const A = new THREE.Matrix4(), B = new THREE.Matrix4(), D = new THREE.Matrix4()
  const reset = () => {
    pose.position.copy(OFFSET); pose.quaternion.identity()
    for (const m of [pieces.body, pieces.head, pieces.tail, ...pieces.leg, ...pieces.armIn, ...pieces.armOut]) m.matrix.identity()
  }
  const api = {
    get flying() { return t0 !== null },
    get landing() { return !!land },
    start(time = now()) { if (t0 === null) { t0 = time; land = null } },
    land(time = now()) { if (t0 !== null && !land) land = { t0: time, k0: k } },
    stop() { t0 = null; land = null; k = 0; reset() },
    update(time = now()) {
      if (t0 === null) return
      const t = time - t0, w = 2 * Math.PI * F.RATE * t
      k = ease(t / F.EASE_IN); let nod = 0
      if (land) {
        const u = (time - land.t0) / F.LAND
        if (u >= 1) { api.stop(); return }
        k = Math.min(k, land.k0) * (1 - ease(u / F.TOUCH))
        nod = F.NOD * Math.sin(Math.PI * Math.min(1, Math.max(0, (u - F.TOUCH) / (1 - F.TOUCH))))
      }
      // 体：胴の中心を軸に前へ傾け、浮き上がって、打ち下ろしで浮き沈みする
      const bob = (F.HOVER - F.BOB * Math.sin(w - 0.6)) * k
      aroundPivot(A, BODY_C, XAX, F.PITCH * k + nod)
      A.premultiply(D.makeTranslation(OFFSET.x, OFFSET.y + bob, OFFSET.z))
      A.decompose(pose.position, pose.quaternion, V(0, 0, 0))
      // 頭：後ろの端を軸に仰向けて、少し下げる
      aroundPivot(pieces.head.matrix, HEAD_P, XAX, -F.HEAD * k + nod).premultiply(D.makeTranslation(0, -F.HEAD_DROP * k, 0))
      // 尾：付け根を軸に少しゆれる
      aroundPivot(pieces.tail.matrix, TAIL_P, XAX, F.TAIL * Math.sin(w - 1.0) * k)
      // 脚：股を軸に後ろへ流す
      ;[-1, 1].forEach((sg, i) => aroundPivot(pieces.leg[i].matrix, hip(sg), XAX, (F.LEG + F.LEG_SWAY * Math.sin(w - 1.2)) * k))
      // 腕と翼：前へ振り出し → 羽ばたき → 腕を下げる（翼もついていく）→ 翼を手首で起こす
      const flap = (F.LIFT + F.FLAP * Math.sin(w)) * k
      ARMS.forEach(({ sg, sh, wrist, openAxis, flapAxis, forward }, i) => {
        aroundPivot(A, sh, YAX, -sg * forward * k)
        A.multiply(aroundPivot(B, sh, flapAxis, flap))
        A.multiply(aroundPivot(B, sh, openAxis, F.ARM_OPEN * k))
        pieces.armIn[i].matrix.copy(A)
        A.multiply(aroundPivot(B, wrist, openAxis, -F.WING_OPEN * k))
        pieces.armOut[i].matrix.copy(A)
      })
      for (const m of [pieces.head, pieces.tail, ...pieces.leg, ...pieces.armIn, ...pieces.armOut]) m.matrixWorldNeedsUpdate = true
    },
  }
  return api
}
