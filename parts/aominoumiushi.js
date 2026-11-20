// ============================================================
//  aominoumiushi — ローポリのアオミノウミウシ（形と動きは workspace/aominoumiushi.html と同じ）
//    ミクロラプトルのパーツ（parts/microraptor.js の microraptorPartGeo）を組み替えて作った
//  createAominoumiushi({ height, glow }): 原点 = いちばん下の端（左右・前後は作業台の原点のまま）・+z が正面（目のある側）・+y が上・x=0 で左右対称
//    height: 全体の高さ [m]。null ならモデル単位のまま（高さ AOMINOUMIUSHI_HEIGHT）
//    作業台で確定した配置（AOMINOUMIUSHI_LAYOUT。パーツごとの 4x4 行列と色）をジオメトリに焼き込む。輪郭線なし・角ばった面のまま
//    動かす単位ごとに頂点の色のメッシュにまとめる（マテリアルは 1 つ。描画 5 回）：
//      体（胴・尾・尾羽・目）/ 後ろの羽 = 脚の羽 #1・#2（左右）/ 前の羽 = 脚の羽 #3・#4 と腕（左右）
//    userData.pose: 体全体（メッシュの親）。userData.pieces: { body, back:[-x,+x], front:[-x,+x] }
//  createAominoumiushiFlap(root): 羽ばたき（作業台の「▶ 羽ばたく」と同じ）
//    羽を付け根（脚の羽の原点）を通る前後の軸（z）まわりに振って上下にパタパタ往復させる。後ろの羽と前の羽は交互、左右は鏡写し
//    start(time) で始め、stop() で元へ。update(time) を毎フレーム呼ぶ（time は秒。省略すると performance.now()）。flapping で今の状態
//  AOMINOUMIUSHI_FLAP: 動きの数値（速さ・振れ幅）
// ============================================================
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { microraptorPartGeo } from './microraptor.js'

export const AOMINOUMIUSHI = {
  GLOW: 0.45,   // 自発光（色に対する割合）。スケッチのような平たい色にする
}

export const AOMINOUMIUSHI_FLAP = {
  RATE: 0.35,                // 1 秒に羽ばたく回数
  FLAP: 25 * Math.PI / 180,  // 振れ幅 [rad]
  EASE_IN: 0.8,              // 振れ幅がいっぱいになるまで [秒]
}

// 作業台（workspace/aominoumiushi.html）で確定した配置。パーツ（名前#番号）ごとの、作業台の座標での 4x4 行列（列優先）と色
//   shape: 形（microraptorPartGeo に渡すミクロラプトルのパーツ）。左右のあるものは #1・#3 が -x 側、#2・#4 が +x 側
//   脚の羽 #3・#4 は #1・#2 を作業台で複製したもの
export const AOMINOUMIUSHI_LAYOUT = {
  '胴':         { shape: '胴', color: '#5966b1', m: [0.6215,0,0,0,0,0.4106,-0.0098,0,0,0.0227,0.9544,0,0,4.9748,0.7396,1] },
  '尾':         { shape: '尾', color: '#38557a', m: [1.8733,0,0,0,0,0.6502,-0.0478,0,0,0.0668,0.9087,0,0,5.0804,-1.1843,1] },
  '尾羽':        { shape: '尾羽', color: '#425ba9', m: [0.5149,0,0,0,0,0.6624,0.0589,0,0,-0.0677,0.7616,0,0,5.0644,-1.5882,1] },
  '目#1':       { shape: '目#1', color: '#101015', m: [1.2349,1.1179,-0.8377,0,-0.4516,0.798,0.399,0,1.029,-0.1056,1.3759,0,-0.3704,5.086,1.6209,1] },
  '目#2':       { shape: '目#2', color: '#101015', m: [1.2349,-1.1179,0.8377,0,0.4516,0.798,0.399,0,-1.029,-0.1056,1.3759,0,0.3704,5.086,1.6209,1] },
  '腕#1':       { shape: '腕#1', color: '#5966b1', m: [0.1311,0.216,-0.0676,0,-0.2468,0.2379,0.2807,0,0.5125,-0.1341,0.5645,0,-0.9686,5.0803,0.5262,1] },
  '腕#2':       { shape: '腕#2', color: '#5966b1', m: [0.1311,-0.216,0.0676,0,0.2468,0.2379,0.2807,0,-0.5125,-0.1341,0.5645,0,0.9686,5.0803,0.5262,1] },
  '脚の羽#1':     { shape: '脚の羽#1', color: '#f3f5fb', m: [-0.1538,-0.9851,-0.0738,0,0.1989,0.0047,-0.4769,0,0.8495,-0.1592,0.3528,0,-0.132,4.9504,-1.0922,1] },
  '脚の羽#2':     { shape: '脚の羽#2', color: '#f3f5fb', m: [-0.1538,0.9851,0.0738,0,-0.1989,0.0047,-0.4769,0,-0.8495,-0.1592,0.3528,0,0.132,4.9504,-1.0922,1] },
  '脚の羽#3':     { shape: '脚の羽#1', color: '#425ba9', m: [-0.1694,-0.9853,0.0207,0,-0.1379,0.0072,-0.7875,0,1.1522,-0.2025,-0.2036,0,-0.7401,5.0342,0.4748,1] },
  '脚の羽#4':     { shape: '脚の羽#2', color: '#425ba9', m: [-0.1694,0.9853,-0.0207,0,0.1379,0.0072,-0.7875,0,-1.1522,-0.2025,-0.2036,0,0.7401,5.0342,0.4748,1] },
}

// ---------- 作業台の座標でのパーツ・動かす単位・軸 ----------
const V = (x, y, z) => new THREE.Vector3(x, y, z)
const flatGeo = g => { const f = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(f.attributes)) if (k !== 'position') f.deleteAttribute(k); return f }
const PARTS = Object.entries(AOMINOUMIUSHI_LAYOUT).map(([key, { shape, color, m }]) => {
  const geo = flatGeo(microraptorPartGeo(shape))
  const M = new THREE.Matrix4().fromArray(m)
  const name = key.split('#')[0], no = Number(key.split('#')[1] || 0)
  const g = geo.clone().applyMatrix4(M); g.computeBoundingBox()
  return { key, name, no, geo, M, color, box: g.boundingBox, c: g.boundingBox.getCenter(V(0, 0, 0)) }
})
const BOX = PARTS.reduce((b, p) => b.union(p.box), new THREE.Box3())
export const AOMINOUMIUSHI_HEIGHT = BOX.max.y - BOX.min.y   // モデル単位の高さ

// 動かす単位に分ける：脚の羽 #1・#2 = 後ろの羽、脚の羽 #3・#4 と腕 = 前の羽、ほか = 体
PARTS.forEach(p => {
  p.sign = p.c.x >= 0 ? 1 : -1
  if (p.name === '脚の羽') p.piece = p.no >= 3 ? 'front' : 'back'
  else if (p.name === '腕') p.piece = 'front'
  else p.piece = 'body'
})
// 羽の付け根（左右ごとに、その単位の脚の羽の原点）。腕は同じ側の前の羽と同じ付け根で動く
const pivotOf = (piece, sg) => V(0, 0, 0).setFromMatrixPosition(PARTS.find(p => p.name === '脚の羽' && p.piece === piece && p.sign === sg).M)
const PIVOTS = { back: [pivotOf('back', -1), pivotOf('back', 1)], front: [pivotOf('front', -1), pivotOf('front', 1)] }

// ---------- 組み立て ----------
// いちばん下の端を原点へ（左右・前後は作業台の原点のまま）
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
    const id = p.piece === 'body' ? 'body' : p.piece + (p.sign > 0 ? 1 : 0)
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

export function createAominoumiushi({ height = null, glow = AOMINOUMIUSHI.GLOW } = {}) {
  if (!_mat || _mat.userData.glow !== glow) { _mat = sharedMat(glow); _mat.userData.glow = glow }
  const root = new THREE.Group(); root.name = 'aominoumiushi'
  if (height) root.scale.setScalar(height / AOMINOUMIUSHI_HEIGHT)
  const pose = new THREE.Group(); pose.name = 'pose'
  pose.position.copy(OFFSET)
  root.add(pose)
  const mesh = id => { const m = new THREE.Mesh(GEOS[id], _mat); m.name = id; m.castShadow = true; m.receiveShadow = true; m.matrixAutoUpdate = false; pose.add(m); return m }
  root.userData.pose = pose
  root.userData.pieces = { body: mesh('body'), back: [mesh('back0'), mesh('back1')], front: [mesh('front0'), mesh('front1')] }
  return root
}

// ---------- 羽ばたき ----------
const ZAX = V(0, 0, 1)
const _T = new THREE.Matrix4(), _Ti = new THREE.Matrix4(), _R = new THREE.Matrix4()
const aroundPivot = (out, pv, axis, a) => {
  _R.makeRotationAxis(axis, a)
  _T.makeTranslation(pv.x, pv.y, pv.z); _Ti.makeTranslation(-pv.x, -pv.y, -pv.z)
  return out.copy(_T).multiply(_R).multiply(_Ti)
}
export function createAominoumiushiFlap(root) {
  const F = AOMINOUMIUSHI_FLAP
  const { pieces } = root.userData
  const now = () => performance.now() / 1000
  const wings = [...pieces.back, ...pieces.front]
  let t0 = null
  const api = {
    get flapping() { return t0 !== null },
    start(time = now()) { if (t0 === null) t0 = time },
    stop() { t0 = null; for (const m of wings) { m.matrix.identity(); m.matrixWorldNeedsUpdate = true } },
    update(time = now()) {
      if (t0 === null) return
      const t = time - t0, w = 2 * Math.PI * F.RATE * t, k = Math.min(1, t / F.EASE_IN)
      ;[['back', 0], ['front', Math.PI]].forEach(([piece, phase]) => {   // 後ろの羽と前の羽は半周期ずらして交互に
        ;[-1, 1].forEach((sg, i) => {
          aroundPivot(pieces[piece][i].matrix, PIVOTS[piece][i], ZAX, sg * F.FLAP * k * Math.sin(w + phase))
          pieces[piece][i].matrixWorldNeedsUpdate = true
        })
      })
    },
  }
  return api
}
