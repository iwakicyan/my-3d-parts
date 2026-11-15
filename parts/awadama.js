// ============================================================
//  awadama — 泡玉（きらきら目の水色の球。形は workspace/kirakira.html と同じ）
//  createAwadama({height, glow, colors, shade}): 原点 = いちばん下・+z が正面・x=0 で左右対称
//    からだ：正二十面体を 1 回細かくした 80 面のまん丸（三角の面を 1 つ真下にして座らせる）。雲と同じく法線を球の中心から外向きにして、なめらかな球に見せる
//    目 2 つ（四つ角の星）・口（上が平らな半円）。それぞれ青い複製を少し大きくして後ろに敷き、輪郭にしている
//    作業台で確定した配置（AWADAMA_LAYOUT。パーツごとの 4x4 行列と色）をジオメトリに焼き込む
//    からだ・目・口は 1 メッシュ（頂点の色）にまとめ、からだの輪郭線を 1 メッシュ。1 つで描画 2 回
//    height: 全体の高さ [m]。null ならモデル単位のまま（高さ AWADAMA_HEIGHT）
//    shade: false なら光を受けず陰影がつかない（色そのままの MeshBasicMaterial）。true なら Lambert で陰影をつけ、glow だけ自発光
//    colors: パーツの色の差し替え（AWADAMA_LAYOUT のパーツ名がキー。例 { 'からだ': 0x5c90bc }）。null ならそのまま
// ============================================================
import * as THREE from 'three'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const AWADAMA = {
  OUTLINE: 0.09,      // からだの輪郭線の厚み（モデル単位）
  GLOW: 0.1,          // 自発光（色に対する割合）。0 で光らない（shade: true のときだけ使う）
  LINE: 0x5f6c8c,     // からだの輪郭線の色
}

// 作業台（workspace/kirakira.html）で確定した配置。パーツごとの、モデルの座標での 4x4 行列（列優先）と色
export const AWADAMA_LAYOUT = {
  'からだ': { m: [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1], c: 0xc6ecf8 },
  '口': { m: [0.8735,0,0,0,0,0.9702,-0.2423,0,0,0.3231,1.294,0,0,3.4618,2.8019,1], c: 0xeef6f8 },
  '口（複製）': { m: [1.0737,0,0,0,0,1.2901,-0.2994,0,0,0.2489,1.0726,0,0,3.5172,2.7923,1], c: 0x567ea4 },
  '目（右）': { m: [1.0073,0.1178,0.3773,0,0.0215,1.027,-0.3781,0,-0.3917,0.3527,0.9357,0,-1.052,3.7874,2.4529,1], c: 0xeaf3f6 },
  '目（右）（複製）': { m: [1.1964,0.1406,0.4342,0,0.0242,1.2332,-0.4659,0,-0.356,0.3364,0.8719,0,-1.0529,3.7808,2.4475,1], c: 0x567ea4 },
  '目（左）': { m: [1.0073,-0.1178,-0.3773,0,-0.0215,1.027,-0.3781,0,0.3917,0.3527,0.9357,0,1.052,3.7874,2.4529,1], c: 0xeaf3f6 },
  '目（左）（複製）': { m: [1.1964,-0.1406,-0.4342,0,-0.0242,1.2332,-0.4659,0,0.356,0.3364,0.8719,0,1.0529,3.7808,2.4475,1], c: 0x567ea4 },
}

// ===== 形（作業台と同じ。パーツの原点のまわりの形で、配置は AWADAMA_LAYOUT で焼き込む） =====
const R = 3.0                  // からだの外接球の半径
const THICK = 0.07             // 目と口の厚み

// からだ：三角の面を 1 つ真下に向け、その三角の頂点の 1 つを正面（+z）に向けて、いちばん下を y=0 にする
function bodyGeo() {
  const g0 = new THREE.IcosahedronGeometry(R, 0)
  const pos = g0.getAttribute('position')
  const a = new THREE.Vector3().fromBufferAttribute(pos, 0), b = new THREE.Vector3().fromBufferAttribute(pos, 1), c = new THREE.Vector3().fromBufferAttribute(pos, 2)
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize()
  const q1 = new THREE.Quaternion().setFromUnitVectors(n, new THREE.Vector3(0, -1, 0))
  const v = a.clone().applyQuaternion(q1)
  const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(v.x, v.z) + Math.PI)
  const g = new THREE.IcosahedronGeometry(R, 1)
  g.applyQuaternion(q2.multiply(q1))
  g.computeBoundingBox()
  g.translate(0, -g.boundingBox.min.y, 0)
  return g
}
// 目：四つ角の星（先 4 つ + くびれ 4 つ = 8 頂点）
function eyeGeo() {
  const H = 0.62, W = 0.54, PINCH = 0.26
  const tips = [[0, H], [W, 0], [0, -H], [-W, 0]]
  const s = new THREE.Shape()
  s.moveTo(...tips[0])
  for (let i = 1; i <= 4; i++) {
    const [x0, y0] = tips[i - 1], [x1, y1] = tips[i % 4]
    s.lineTo((x0 + x1) * PINCH, (y0 + y1) * PINCH)
    s.lineTo(x1, y1)
  }
  return new THREE.ExtrudeGeometry(s, { depth: THICK, bevelEnabled: false })
}
// 口：上が平らな半円（下の弧を 4 本の直線で）。上の辺の真ん中から扇に三角を張る
function mouthGeo() {
  const MW = 0.36, MD = 0.34, SEG = 4
  const ring = []
  for (let i = 0; i <= SEG; i++) { const a = -Math.PI + Math.PI * i / SEG; ring.push([MW * Math.cos(a), MD * Math.sin(a)]) }
  ring[0][1] = 0; ring[SEG][1] = 0
  const loop = [[0, 0], ...ring]
  const P = []
  const tri = (a, b, c) => P.push(...a, ...b, ...c)
  const v3 = ([x, y], z) => [x, y, z]
  for (let i = 0; i < SEG; i++) {
    tri(v3([0, 0], THICK), v3(ring[i], THICK), v3(ring[i + 1], THICK))
    tri(v3([0, 0], 0), v3(ring[i + 1], 0), v3(ring[i], 0))
  }
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length]
    tri(v3(a, 0), v3(b, 0), v3(b, THICK)); tri(v3(a, 0), v3(b, THICK), v3(a, THICK))
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  return g
}
const SHAPES = { 'からだ': bodyGeo, '口': mouthGeo, '口（複製）': mouthGeo,
  '目（右）': eyeGeo, '目（右）（複製）': eyeGeo, '目（左）': eyeGeo, '目（左）（複製）': eyeGeo }

// 位置だけ残して頂点の色を塗る。目と口は角ばった面のまま（三角ごとの法線）
// smooth: その点を中心にした球の法線にする（からだ。雲と同じなめらかな陰影）
const flat = (geo, M, c, smooth = null) => {
  let g = geo.index ? geo.toNonIndexed() : geo.clone()
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k)
  g.applyMatrix4(M)
  g.computeVertexNormals()
  if (smooth) {
    const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(smooth).normalize(); n.setXYZ(i, v.x, v.y, v.z) }
  }
  const n = g.attributes.position.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return g
}
// 輪郭線の形：頂点をまとめてなめらかな法線にし、法線方向に d だけ押し出す
function outlineGeo(geo, d) {
  const s = geo.clone()
  for (const k of Object.keys(s.attributes)) if (k !== 'position') s.deleteAttribute(k)
  const m = mergeVertices(s, 1e-4)
  m.computeVertexNormals()
  const p = m.attributes.position, n = m.attributes.normal
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d)
  m.deleteAttribute('normal')
  return m
}

// モデル単位の高さ（いちばん下からてっぺんまで）
export const AWADAMA_HEIGHT = (() => { const g = bodyGeo(); g.computeBoundingBox(); return g.boundingBox.max.y })()
// からだの球の中心（正二十面体は中心について対称なので、高さのちょうど半分）
const BODY_CENTER = new THREE.Vector3(0, AWADAMA_HEIGHT / 2, 0)

// いくつ作っても、同じ色・同じ glow なら形とマテリアルは 1 つを使い回す
const _geos = new Map(), _mats = new Map()
let _line = null, _lineMat = null
export function createAwadama({ height = null, glow = AWADAMA.GLOW, colors = null, shade = true } = {}) {
  const key = JSON.stringify(colors || {})
  if (!_geos.has(key)) {
    const parts = Object.entries(AWADAMA_LAYOUT).map(([name, { m, c }]) =>
      flat(SHAPES[name](), new THREE.Matrix4().fromArray(m), new THREE.Color(colors?.[name] ?? c),
        name === 'からだ' ? BODY_CENTER.clone().applyMatrix4(new THREE.Matrix4().fromArray(m)) : null))
    _geos.set(key, mergeGeometries(parts))
  }
  const matKey = shade ? glow : 'basic'
  if (!shade && !_mats.has(matKey)) _mats.set(matKey, new THREE.MeshBasicMaterial({ vertexColors: true }))
  if (!_mats.has(matKey)) {
    // 色は頂点の色で持ち、白の Lambert に掛ける。自発光も頂点の色 × glow
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow, glow, glow) })
    mat.onBeforeCompile = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;')
    }
    _mats.set(matKey, mat)
  }
  if (!_line) {
    _line = outlineGeo(bodyGeo(), AWADAMA.OUTLINE)
    _lineMat = new THREE.MeshBasicMaterial({ color: AWADAMA.LINE, side: THREE.BackSide })
  }
  const root = new THREE.Group(); root.name = 'awadama'
  const body = new THREE.Mesh(_geos.get(key), _mats.get(matKey)); body.name = '泡玉'
  const line = new THREE.Mesh(_line, _lineMat); line.name = '泡玉(線)'; line.userData.outline = true
  root.add(body, line)
  if (height) root.scale.setScalar(height / AWADAMA_HEIGHT)
  return root
}
