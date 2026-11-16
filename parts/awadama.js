// ============================================================
//  awadama — 泡玉（きらきら目の水色の球。形は workspace/kirakira.html と同じ）
//  createAwadama({kind, height, glow, colors, shade}): 原点 = いちばん下・+z が正面・x=0 で左右対称
//    kind: 種類（AWADAMA_KINDS のキー。スケッチ documents/sketch/awadama.webp の 7 種類 + もとの kirakira）
//      kirakira きらきら目・半円の口 / sakasa 口が目の上（上下さかさの半円） / yoru 紺色のからだ / heart ピンクのからだ・ハートの目
//      kuma くまの耳・ωの口 / oyako 小さい泡玉がくっついた親子 / mikan オレンジのからだ・へた（軸と葉）・＞＜の目 / maru まんまるの目と口
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
// --- 種類を増やすときの形 ---
// 多角形（[x,y] の並び）を厚み THICK で押し出す
const polyGeo = pts => { const s = new THREE.Shape(); s.moveTo(...pts[0]); for (const p of pts.slice(1)) s.lineTo(...p); return new THREE.ExtrudeGeometry(s, { depth: THICK, bevelEnabled: false }) }
// まる（n 角形）
const circleGeo = (r, n = 10) => () => polyGeo(Array.from({ length: n }, (_, i) => [r * Math.cos(2 * Math.PI * i / n), r * Math.sin(2 * Math.PI * i / n)]))
// ハート（真ん中を原点に。幅 0.72・高さ 0.62 くらい）
function heartGeo() {
  const N = 16, k = 0.0225, pts = []
  for (let i = 0; i < N; i++) {
    const t = 2 * Math.PI * i / N
    pts.push([k * 16 * Math.sin(t) ** 3, k * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5)])
  }
  return polyGeo(pts)
}
// 線（[x,y] の折れ線を太さ w で）。区間ごとの四角と、つなぎ目・端の八角形を重ねる
const strokeGeo = (pts, w) => () => {
  const gs = []
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], len = Math.hypot(x1 - x0, y1 - y0)
    const nx = -(y1 - y0) / len * w / 2, ny = (x1 - x0) / len * w / 2
    gs.push(polyGeo([[x0 + nx, y0 + ny], [x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny]]))
  }
  for (const [x, y] of pts) gs.push(circleGeo(w / 2, 8)().translate(x, y, 0))
  for (const g of gs) for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k)
  return mergeGeometries(gs)
}
// 円弧の折れ線（中心 cx,cy・半径 r・角度 a0→a1・n 区間）
const arc = (cx, cy, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] })
// ω の口（上の端が原点のあたり）
const omegaGeo = strokeGeo([...arc(-0.19, 0, 0.19, Math.PI, 2 * Math.PI, 4), ...arc(0.19, 0, 0.19, Math.PI, 2 * Math.PI, 4).slice(1)], 0.08)
// ＞ と ＜ の目（見る人から見て左の目＝目（右）が ＞）
const gtGeo = strokeGeo([[-0.34, 0.3], [0.32, 0], [-0.34, -0.3]], 0.1)
const ltGeo = strokeGeo([[0.34, 0.3], [-0.32, 0], [0.34, -0.3]], 0.1)
// 葉（付け根が原点・+x へ長さ 1.3 のレンズ形）
function leafGeo() {
  const s = new THREE.Shape()
  s.moveTo(0, 0); s.quadraticCurveTo(0.6, 0.55, 1.3, 0.08); s.quadraticCurveTo(0.7, -0.4, 0, 0)
  return new THREE.ExtrudeGeometry(s, { depth: THICK, bevelEnabled: false, curveSegments: 4 })
}
const stemGeo = () => new THREE.CylinderGeometry(0.11, 0.13, 1.2, 5)
const earGeo = () => new THREE.IcosahedronGeometry(1.05, 1)

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

// ===== 種類 =====
// body: からだの色（null なら AWADAMA_LAYOUT の水色のまま。colors の 'からだ' で差し替えられるのはこの水色の種類だけにするとよい）
export const AWADAMA_KINDS = {
  kirakira: { body: null },
  sakasa:   { body: null },
  yoru:     { body: 0x4d5891 },
  heart:    { body: 0xfcbbe8 },
  kuma:     { body: null },
  oyako:    { body: null },
  mikan:    { body: 0xfdb168 },
  maru:     { body: null },
}
const EDGE = 0x567ea4         // 白い目・口の輪郭（後ろに敷く複製）の色
const STROKE = 0x1e2b55       // 線で描く目・口（ω・＞＜）の色
const EYE_W = 0xeaf3f6, MOUTH_W = 0xeef6f8
const STEM = 0x6aa83a, LEAF = 0x8ccf3f

const M4 = () => new THREE.Matrix4()
const L = name => M4().fromArray(AWADAMA_LAYOUT[name].m)
// からだの中心を通る x 軸のまわりに deg 度まわす（負で上へ）
const aroundX = deg => M4().makeTranslation(BODY_CENTER.x, BODY_CENTER.y, BODY_CENTER.z)
  .multiply(M4().makeRotationX(deg * Math.PI / 180)).multiply(M4().makeTranslation(-BODY_CENTER.x, -BODY_CENTER.y, -BODY_CENTER.z))
// 白いパーツと、その輪郭（少し大きくして後ろに敷いた複製）
const withEdge = (name, shape, M, c) => [
  { name, shape, M, c },
  { name: name + '（複製）', shape, M: M.clone().multiply(M4().makeTranslation(0, 0, -0.01)).multiply(M4().makeScale(1.2, 1.2, 0.9)), c: EDGE },
]
const STAR = ['目（右）', '目（右）（複製）', '目（左）', '目（左）（複製）']
const MOUTH = ['口', '口（複製）']
const fromLayout = names => names.map(name => ({ name, shape: SHAPES[name], M: L(name), c: AWADAMA_LAYOUT[name].c }))

// 種類ごとのパーツ（shape・行列 M・色 c・key: colors で差し替えるときの名前・smooth: なめらかにする球の中心（モデルの座標））と、輪郭線をつけるもの（geo・M・d: 厚み）
function kindParts(kind) {
  const body = { name: 'からだ', key: 'からだ', shape: bodyGeo, M: L('からだ'), c: AWADAMA_KINDS[kind]?.body ?? AWADAMA_LAYOUT['からだ'].c, smooth: BODY_CENTER.clone() }
  const parts = [body], lines = [{ geo: bodyGeo, M: M4(), d: AWADAMA.OUTLINE }]
  if (kind === 'sakasa') {
    // 口を目の上へ動かし、上下さかさ（平らな辺が下）にする
    const up = aroundX(-17), flip = M4().makeRotationZ(Math.PI)
    parts.push(...fromLayout(STAR), ...fromLayout(MOUTH).map(p => ({ ...p, M: up.clone().multiply(p.M).multiply(flip) })))
  } else if (kind === 'heart') {
    for (const side of ['目（右）', '目（左）']) parts.push(...withEdge(side, heartGeo, L(side), EYE_W))
    parts.push(...fromLayout(MOUTH))
  } else if (kind === 'kuma') {
    parts.push(...fromLayout(STAR), { name: '口', shape: omegaGeo, M: aroundX(-3).multiply(L('口')), c: STROKE })
    // 耳：からだの上の左右に、半分くらい埋めた小さい球
    for (const sx of [-1, 1]) {
      const a = 38 * Math.PI / 180, r = 2.75
      const c = BODY_CENTER.clone().add(new THREE.Vector3(sx * r * Math.sin(a), r * Math.cos(a), -0.3))
      const M = M4().makeTranslation(c.x, c.y, c.z)
      parts.push({ name: '耳', key: 'からだ', shape: earGeo, M, c: body.c, smooth: c })
      lines.push({ geo: earGeo, M, d: AWADAMA.OUTLINE })
    }
  } else if (kind === 'mikan') {
    parts.push({ name: '目（右）', shape: gtGeo, M: L('目（右）'), c: STROKE }, { name: '目（左）', shape: ltGeo, M: L('目（左）'), c: STROKE }, ...fromLayout(MOUTH))
    // へた：てっぺんから少し傾いた軸と、右へ伸びる葉
    const top = BODY_CENTER.y * 2
    const stemM = M4().makeTranslation(0, top + 0.35, 0).multiply(M4().makeRotationZ(-0.08))
    const leafM = M4().makeTranslation(0.05, top + 0.75, 0).multiply(M4().makeRotationZ(0.3))
    parts.push({ name: '軸', shape: stemGeo, M: stemM, c: STEM }, { name: '葉', shape: leafGeo, M: leafM, c: LEAF })
    lines.push({ geo: stemGeo, M: stemM, d: 0.05 }, { geo: leafGeo, M: leafM, d: 0.05 })
  } else if (kind === 'maru') {
    for (const side of ['目（右）', '目（左）']) parts.push(...withEdge(side, circleGeo(0.42), aroundX(-2).multiply(L(side)), EYE_W))
    parts.push(...withEdge('口', circleGeo(0.25), aroundX(2).multiply(L('口')).multiply(M4().makeTranslation(0, -0.2, 0)), EYE_W))
  } else {
    // kirakira・yoru・oyako（oyako の子は createAwadama で足す）
    parts.push(...fromLayout([...STAR, ...MOUTH]))
  }
  return { parts, lines }
}
// oyako の子：右下の手前にくっつく小さい泡玉（大きさ・置き場所・向き）
const OYAKO_CHILD = { scale: 0.45, pos: [2.9, 2.55, 1.1], rotY: -0.25 }

// いくつ作っても、同じ種類・同じ色・同じ glow なら形とマテリアルは 1 つを使い回す
const _geos = new Map(), _mats = new Map(), _lines = new Map()
let _lineMat = null
export function createAwadama({ kind = 'kirakira', height = null, glow = AWADAMA.GLOW, colors = null, shade = true } = {}) {
  if (!AWADAMA_KINDS[kind]) kind = 'kirakira'
  const key = kind + JSON.stringify(colors || {})
  if (!_geos.has(key)) {
    const { parts } = kindParts(kind)
    _geos.set(key, mergeGeometries(parts.map(p =>
      flat(p.shape(), p.M, new THREE.Color(colors?.[p.key ?? p.name] ?? p.c), p.smooth ?? null))))
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
  if (!_lineMat) _lineMat = new THREE.MeshBasicMaterial({ color: AWADAMA.LINE, side: THREE.BackSide })
  if (!_lines.has(kind)) _lines.set(kind, mergeGeometries(kindParts(kind).lines.map(({ geo, M, d }) => outlineGeo(geo().applyMatrix4(M), d))))
  const root = new THREE.Group(); root.name = 'awadama'
  const body = new THREE.Mesh(_geos.get(key), _mats.get(matKey)); body.name = '泡玉'
  const line = new THREE.Mesh(_lines.get(kind), _lineMat); line.name = '泡玉(線)'; line.userData.outline = true
  root.add(body, line)
  if (kind === 'oyako') {
    const child = createAwadama({ glow, colors, shade })
    child.scale.setScalar(OYAKO_CHILD.scale); child.position.set(...OYAKO_CHILD.pos); child.rotation.y = OYAKO_CHILD.rotY
    root.add(child)
  }
  if (height) root.scale.setScalar(height / AWADAMA_HEIGHT)
  return root
}
