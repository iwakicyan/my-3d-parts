// ============================================================
//  sneaker — スニーカーに乗った小鳥（形は workspace/sneaker.html と同じ）
//  createSneaker({bird, colors, height, glow}): 片足ぶん。原点 = 靴底の中心（地面）・+z が正面（つま先）
//    bird: 'white'（左足の白い小鳥）か 'dark'（右足の黒い小鳥）。SNEAKER_BIRDS の色を SNEAKER_COLORS に重ねる
//    height: 全体の高さ [m]（靴底から頭のてっぺんまで）。null ならモデル単位のまま（高さ SNEAKER_HEIGHT）
//    作業台で確定した配置（SNEAKER_LAYOUT。パーツごとの 4x4 行列）をジオメトリに焼き込む
//    翼（笹かまぼこ）以外は 1 メッシュ（頂点の色）＋輪郭線 1 メッシュにまとめる。翼は左右 1 枚ずつ（羽ばたかせるため）。1 足で描画 6 回
//    輪郭線は法線方向に押し出した裏面。押し出しは作業台と同じく倍率を掛ける前の形で行い（頭など大きくしたパーツは線も太い）、ジオメトリに焼き込む
//    userData.wings: 翼の Group 2 つ（原点 = 体に近い側の端。userData.sign で +x 側が 1、-x 側が -1）
//  createSneakerFlap(root): 羽ばたき。update(th) で翼を前後の軸（z）まわりに th [rad] 上げる（左右は鏡写し）。stop() で元へ
//  SNEAKER_HOP: 作業台の「飛ぶ」動きの数値（モデル単位）。右足→左足の順に交互に飛び、それぞれ相手より LEAD だけ前に着地する
//  一足で置くときは、右足を -x、左足を +x に SNEAKER_HOP.GAP ずつずらす（+z を向いて履くので、着ける人の右が -x）
// ============================================================
import * as THREE from 'three'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const SNEAKER = {
  OUTLINE: 0.08,      // 輪郭線の厚み（パーツの倍率を掛ける前のモデル単位）
  GLOW: 0.45,         // 自発光（色に対する割合）。スケッチのような平たい色にする
}
export const SNEAKER_COLORS = {
  upper: 0x9a483e, toe: 0xfffaf0, heel: 0x46393a, lace: 0xfffaf0, beak: 0xffa040,
  head: 0xffffff, eye: 0x222222, wing: 0xffffff, line: 0x233540,
}
// 小鳥の色違い（頭・目・翼）
export const SNEAKER_BIRDS = {
  white: { head: 0xffffff, eye: 0x222222, wing: 0xffffff },   // 左足
  dark:  { head: 0x2d2a2a, eye: 0xffffff, wing: 0x2d2a2a },   // 右足
}
// 作業台の飛ぶ動き（モデル単位・秒・rad）
export const SNEAKER_HOP = {
  GAP: 2.8,       // 一足の真ん中から片方の靴の中心まで
  LEAD: 3.75,     // 着地したとき相手より前に出る距離（1 回に飛ぶ距離は 2×LEAD）
  HEIGHT: 3.0,    // 飛ぶ高さ
  HOP: 0.7,       // 1 回飛んでいる時間
  REST: 0.25,     // 着地してから次の足が飛ぶまで
  PITCH: 0.22,    // 飛び立ちで上を向き、着地の前に下を向く角度
  FLAPS: 2.5,     // 1 回飛ぶ間に羽ばたく回数
  FLAP: 0.9,      // 羽ばたきの振れ幅
}

// 作業台（workspace/sneaker.html）で確定した配置。パーツ（名前#番号）ごとの、モデルの座標での 4x4 行列（列優先）
// 翼・目は #1 が -x 側、#2 が +x 側
export const SNEAKER_LAYOUT = {
  'はき口': [0.9129,0,0,0,0,0.8848,0,0,0,0,1,0,0,0,-2,1],
  '甲': [0.7955,0,0,0,0,0.7989,0,0,0,0,1,0,0,0.0679,0,1],
  'つま先': [1.0288,0,0,0,0,0.9089,0,0,0,0,1,0,0,0,1.6,1],
  'つま先の縁': [1,0,0,0,0,2.5063,0,0,0,0,1,0,0,0,1.6,1],
  'かかと': [1,0,0,0,0,0.9309,0,0,0,0,1.2346,0,0,-0.1813,-1.6962,1],
  '頭': [3.5402,0,0,0,0,3.3184,0,0,0,0,3.414,0,0,3.9973,-2.0081,1],
  '目#1': [0.5453,0,0,0,0,0.53,-0.3152,0,0,0.5111,0.8595,0,-0.6337,4.5809,-0.9948,1],
  '目#2': [0.5453,0,0,0,0,0.53,-0.3152,0,0,0.5111,0.8595,0,0.6337,4.5809,-0.9948,1],
  '翼#1': [0.6641,2.9888,-1.2374,0,-2.1306,0.6161,0.3446,0,0.3668,0.4927,1.3869,0,-2.0792,3.868,-2.5449,1],
  '翼#2': [0.6641,-2.9888,1.2374,0,2.1306,0.6161,0.3446,0,-0.3668,0.4927,1.3869,0,2.0792,3.868,-2.5449,1],
  'くちばし': [1,0,0,0,0,0.5729,-0.1736,0,0,0.2899,0.957,0,0,4.4353,-0.4542,1],
  'ひも#1': [1,0,0,0,0,1.0037,-0.0699,0,0,0.0695,0.9976,0,0,3.2027,0.1073,1],
  'ひも#2': [1,0,0,0,0,1.0037,-0.0699,0,0,0.0695,0.9976,0,0,2.9596,0.6716,1],
  'ひも#3': [1,0,0,0,0,1.0037,-0.0699,0,0,0.0695,0.9976,0,0,2.7165,1.2358,1],
}

// ===== 形（作業台と同じ。パーツの原点のまわりの形で、配置は SNEAKER_LAYOUT で焼き込む） =====
const W = 2.2                          // 靴の半分の幅
const H = 4.0                          // はき口の高さ
const TOE_Z = 1.6, TOE_H = 2.9, TOE_L = 2.3   // つま先の始まり・高さ・長さ
const ARCH_H = 0.9, ARCH_N = 6         // 甲のアールの高さ・分割数
const archDrop = x => ARCH_H * (1 - Math.sqrt(Math.max(0, 1 - (x / W) ** 2)))   // 甲の真ん中の高さからの下がり

// はき口：縦の楕円柱
function collarGeo() {
  const g = new THREE.CylinderGeometry(1, 1, H, 12)
  g.scale(W, 1, 1.9); g.translate(0, H / 2, 0)
  return g
}
// 甲：かまぼこ形（下が平ら・左右は縦・上は楕円のアール）の断面を、横から見た坂に沿ってつなぐ
function vampGeo() {
  const V = { z0: -2.12, zs: -0.3, z1: TOE_Z + 0.17, yTop: H - 0.03, yFront: TOE_H + 0.07 }
  const top = z => z <= V.zs ? V.yTop : V.yTop + (V.yFront - V.yTop) * (z - V.zs) / (V.z1 - V.zs)
  const ring = z => {
    const yt = top(z), ys = yt - ARCH_H, pts = [[-W, 0], [-W, ys]]
    for (let k = 1; k < ARCH_N; k++) { const a = Math.PI * k / ARCH_N; pts.push([-W * Math.cos(a), ys + ARCH_H * Math.sin(a)]) }
    pts.push([W, ys], [W, 0])
    return pts.map(([x, y]) => [x, y, z])
  }
  const pos = [], idx = []
  const strip = rings => {
    const base = pos.length / 3, n = rings[0].length
    rings.forEach(r => r.forEach(p => pos.push(...p)))
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < n - 1; j++) {
      const a = base + i * n + j, b = a + 1, c = a + n, d = c + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const fan = (pts, flip) => {
    const base = pos.length / 3
    pos.push(0, pts.reduce((s, p) => s + p[1], 0) / pts.length, pts[0][2]); pts.forEach(p => pos.push(...p))
    for (let j = 0; j < pts.length; j++) { const a = base + 1 + j, b = base + 1 + (j + 1) % pts.length; flip ? idx.push(base, b, a) : idx.push(base, a, b) }
  }
  const zs = [V.z0, V.zs, V.z1]
  strip(zs.map(ring))
  strip(zs.map(z => [[W, 0, z], [-W, 0, z]]))
  fan(ring(V.z0), false)
  fan(ring(V.z1), true)
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx); g.computeVertexNormals()
  return g
}
// つま先：楕円体の前・上の 1/4
function toeGeo() {
  const g = new THREE.SphereGeometry(1, 8, 4, 0, Math.PI, 0, Math.PI / 2)
  g.scale(W + 0.02, TOE_H, TOE_L)
  return g
}
// つま先の縁
function toeRimGeo() {
  const g = new THREE.CylinderGeometry(1, 1, 0.28, 8, 1, false, -Math.PI / 2, Math.PI)
  g.scale(W + 0.12, 1, TOE_L + 0.12); g.translate(0, 0.14, 0)
  return g
}
// かかと：はき口の後ろ半分を包む板。上の縁は前へ行くほど下がり、前の端は少し内側へ寄せる
function heelGeo() {
  const t0 = Math.PI * 0.5 + 0.25, len = Math.PI - 0.5
  const g = new THREE.CylinderGeometry(1, 1, 1, 8, 2, false, t0, len)
  const p = g.attributes.position, hTop = 3.3, hEnd = 1.4, END_IN = 0.05
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i)
    const a = Math.abs(Math.atan2(x, -z)) / (len / 2)
    p.setY(i, y * (hTop - (hTop - hEnd) * Math.pow(Math.min(1, a), 2.2)))
    if (a > 0.99) { p.setX(i, x * (1 - END_IN)); p.setZ(i, z * (1 - END_IN)) }
  }
  g.computeVertexNormals()
  g.scale(W + 0.1, 1, 1.9 + 0.1)
  return g
}
// ひも：甲の坂に横向きに寝かせた平たいカプセル（置き場所は SNEAKER_LAYOUT）
function laceLocalGeo() {
  const a = new THREE.Vector2(-0.3, H - 0.1), b = new THREE.Vector2(TOE_Z + 0.05, TOE_H)
  const ang = Math.atan2(a.y - b.y, b.x - a.x)
  const g = new THREE.CapsuleGeometry(0.17, 1.5, 1, 4)
  g.rotateZ(Math.PI / 2); g.scale(1, 0.35, 1)
  const p = g.attributes.position
  for (let j = 0; j < p.count; j++) p.setY(j, p.getY(j) - archDrop(p.getX(j)))
  g.rotateX(ang)
  return g
}
const headGeo = () => new THREE.SphereGeometry(0.5, 12, 8)
// 目：前（+z）の半分だけの黒い半球
function eyeGeo() {
  const g = new THREE.SphereGeometry(0.5, 6, 2, 0, Math.PI * 2, 0, Math.PI / 2)
  g.rotateX(Math.PI / 2)
  return g
}
// 翼（笹かまぼこ）：平たい葉の形。両端は平らに切り落として面取り。長さは z 向き
function wingGeo() {
  const L = 0.8, Wd = 0.25, T = 0.1, CUT = 0.7
  const g = new THREE.SphereGeometry(1, 6, 4)
  g.rotateZ(Math.PI / 2)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
    const r0 = Math.sqrt(Math.max(1e-9, 1 - x * x)), r = Math.hypot(y, z)
    const f = r0 > 1e-4 ? r / r0 : 0
    const u = Math.max(-CUT, Math.min(CUT, x)), w = 1 - u * u, a = Math.atan2(z, y)
    p.setXYZ(i, u, Math.cos(a) * f * w, Math.sin(a) * f * w)
  }
  g.scale(L / CUT, T, Wd); g.rotateY(Math.PI / 2)
  g.computeVertexNormals()
  return g
}
const beakGeo = () => new THREE.OctahedronGeometry(0.5)

// パーツの一覧：[名前, 形（パーツの原点のまわり）, 色の名前, 輪郭線]
function partList() {
  return [
    ['はき口', collarGeo, 'upper', true],
    ['甲', vampGeo, 'upper', true],
    ['つま先', toeGeo, 'toe', true],
    ['つま先の縁', toeRimGeo, 'toe', true],
    ['かかと', heelGeo, 'heel', true],
    ['ひも#1', laceLocalGeo, 'lace', true],
    ['ひも#2', laceLocalGeo, 'lace', true],
    ['ひも#3', laceLocalGeo, 'lace', true],
    ['頭', headGeo, 'head', true],
    ['目#1', eyeGeo, 'eye', false],
    ['目#2', eyeGeo, 'eye', false],
    ['くちばし', beakGeo, 'beak', false],
    ['翼#1', wingGeo, 'wing', true],
    ['翼#2', wingGeo, 'wing', true],
  ]
}

// 輪郭線の形：頂点をまとめてなめらかな法線にし、法線方向に d だけ押し出す（角でも割れない）
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
const plain = geo => {
  let g = geo.index ? geo.clone() : mergeVertices(geo.clone(), 1e-6)
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  return g
}
const paint = (geo, c) => {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}

// モデル単位の高さ（靴底から頭のてっぺんまで）
export const SNEAKER_HEIGHT = (() => {
  const box = new THREE.Box3()
  for (const [name, make] of partList()) {
    const g = make().applyMatrix4(new THREE.Matrix4().fromArray(SNEAKER_LAYOUT[name]))
    g.computeBoundingBox(); box.union(g.boundingBox)
  }
  return box.max.y
})()

export function createSneaker({ bird = 'white', colors = null, height = null, glow = SNEAKER.GLOW } = {}) {
  const C = { ...SNEAKER_COLORS, ...SNEAKER_BIRDS[bird], ...(colors || {}) }
  const root = new THREE.Group(); root.name = 'sneaker'

  // 色は頂点の色で持ち、白の Lambert に掛ける。自発光も頂点の色 × glow
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow, glow, glow) })
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;')
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: C.line, side: THREE.BackSide })

  const body = [], bodyLines = [], wings = []
  for (const [name, make, colorKey, outline] of partList()) {
    const M = new THREE.Matrix4().fromArray(SNEAKER_LAYOUT[name])
    const geo = make()
    const g = paint(plain(geo).applyMatrix4(M), new THREE.Color(C[colorKey]))
    g.computeVertexNormals()
    const line = outline ? outlineGeo(geo, SNEAKER.OUTLINE).applyMatrix4(M) : null
    if (name.startsWith('翼')) wings.push({ name, g, line })
    else { body.push(g); if (line) bodyLines.push(line) }
  }

  const bodyMesh = new THREE.Mesh(mergeGeometries(body), mat); bodyMesh.name = '靴と体'
  root.add(bodyMesh)
  const bodyLine = new THREE.Mesh(mergeGeometries(bodyLines), lineMat); bodyLine.name = '靴と体(線)'; bodyLine.userData.outline = true
  root.add(bodyLine)

  // 翼：体に近い側の端を原点にした Group に入れる（羽ばたきの軸）
  root.userData.wings = wings.map(({ name, g, line }) => {
    g.computeBoundingBox()
    const box = g.boundingBox, c = box.getCenter(new THREE.Vector3()), sign = c.x >= 0 ? 1 : -1
    const pivot = new THREE.Vector3(sign > 0 ? box.min.x : box.max.x, c.y, c.z)
    const grp = new THREE.Group(); grp.name = name; grp.position.copy(pivot); grp.userData.sign = sign
    const m = new THREE.Mesh(g.translate(-pivot.x, -pivot.y, -pivot.z), mat); m.name = name
    const o = new THREE.Mesh(line.translate(-pivot.x, -pivot.y, -pivot.z), lineMat); o.name = name + '(線)'; o.userData.outline = true
    grp.add(m, o); root.add(grp)
    return grp
  })

  if (height) root.scale.setScalar(height / SNEAKER_HEIGHT)
  return root
}

// 羽ばたき：翼を前後の軸（z）まわりに th [rad] 上げる（+x 側は +z 軸まわりに +th、-x 側は -th で、どちらも先が上がる）
export function createSneakerFlap(root) {
  const wings = root.userData.wings || []
  return {
    update(th) { for (const w of wings) w.rotation.z = w.userData.sign * th },
    stop() { for (const w of wings) w.rotation.z = 0 },
  }
}

// 1 回飛ぶ間（s = 0〜1）の羽ばたきの角度（始めと終わりは小さく）
export const sneakerFlapAngle = s => SNEAKER_HOP.FLAP * Math.sin(Math.PI * s) * Math.sin(2 * Math.PI * SNEAKER_HOP.FLAPS * s)
