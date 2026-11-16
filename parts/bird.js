// ============================================================
//  bird — スニーカーの小鳥だけを取り出して、尾羽と足（ひし形）を足した鳥（形は workspace/bird.html と同じ）
//  createBird({ length, glow, colors }): 原点 = 足の下の端（とまる所）・+z が正面（くちばし）・+y が上・x=0 で左右対称
//    length: 全長 [m]（尾羽の後ろの端からくちばしの先まで）。null ならモデル単位のまま（全長 BIRD_LENGTH）
//    colors: パーツの名前（#番号の前。頭・目・翼・尾羽・くちばし・ひし形）→ 色。BIRD_LAYOUT の色の代わりに使う
//    作業台で確定した配置（BIRD_LAYOUT。パーツごとの 4x4 行列と色）をジオメトリに焼き込む
//    翼以外は 1 メッシュ（頂点の色）＋輪郭線 1 メッシュにまとめる。翼は左右 1 枚ずつ（羽ばたかせるため）
//    userData.wings: 翼の Group 2 つ（原点 = 体に近い側の端。userData.sign で +x 側が 1、-x 側が -1）
//  createBirdInstances(count, { length, glow }): たくさんの鳥をまとめて描く（描画 6 回）。set(i, matrix, th) で i 羽目を置いて翼を上げ、commit() で送る
//  createBirdFlap(root): 羽ばたき。update(th) で翼を前後の軸（z）まわりに th [rad] 上げる（左右は鏡写し）。stop() で元へ
//  BIRD_FLAP: 作業台の羽ばたき（1 秒に RATE 回・振れ幅 FLAP [rad]）。birdFlapAngle(t) で t 秒の角度
// ============================================================
import * as THREE from 'three'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { headGeo, eyeGeo, wingGeo, beakGeo, outlineGeo } from './sneaker.js'

export const BIRD = {
  OUTLINE: 0.08,   // 輪郭線の厚み（パーツの倍率を掛ける前のモデル単位）
  GLOW: 0.45,      // 自発光（色に対する割合）。スケッチのような平たい色にする
  LINE: 0x233540,  // 輪郭線の色
}
export const BIRD_FLAP = { RATE: 2, FLAP: 30 * Math.PI / 180 }
export const birdFlapAngle = t => BIRD_FLAP.FLAP * Math.sin(2 * Math.PI * BIRD_FLAP.RATE * t)

// 作業台（workspace/bird.html）で確定した配置。パーツ（名前#番号）ごとの、鳥の座標での 4x4 行列（列優先）と色
// 翼・目・ひし形は #1 が -x 側、#2 が +x 側。この座標の原点は作業台のもの（createBird で足の下へ寄せる）
export const BIRD_LAYOUT = {
  '頭':       { color: '#ffffff', m: [3.5402,0,0,0,0,3.3184,0,0,0,0,3.414,0,0,3.9973,-2.0081,1] },
  '目#1':     { color: '#222222', m: [0.5453,0,0,0,0,0.3944,-0.2346,0,0,0.5111,0.8595,0,-0.7212,4.3982,-0.8627,1] },
  '目#2':     { color: '#222222', m: [0.5453,0,0,0,0,0.3944,-0.2346,0,0,0.5111,0.8595,0,0.7212,4.3982,-0.8627,1] },
  '翼#1':     { color: '#ffffff', m: [0.8235,2.922,-2.7484,0,-1.9652,0.644,0.0958,0,0.3691,0.9581,1.1292,0,-1.6613,3.4337,-2.7644,1] },
  '翼#2':     { color: '#ffffff', m: [0.8235,-2.922,2.7483,0,1.9652,0.644,0.0958,0,-0.3691,0.9581,1.1292,0,1.6613,3.4337,-2.7644,1] },
  '尾羽':     { color: '#ffffff', m: [4.227,0,0,0,0,3.44,0.7901,0,0,-0.3402,1.4814,0,0,3.3265,-3.5707,1] },
  'くちばし': { color: '#ffa040', m: [1.2573,0,0,0,0,0.7711,-0.038,0,0,0.056,1.1344,0,0,4.1261,-0.4542,1] },
  'ひし形#1': { color: '#ffa040', m: [0.9513,-0.1556,0.266,0,0.0415,0.5694,0.1846,0,-0.4515,-0.4125,1.3735,0,-0.8856,2.4811,-1.5798,1] },
  'ひし形#2': { color: '#ffa040', m: [0.9513,0.1556,-0.266,0,-0.0415,0.5694,0.1846,0,0.4515,-0.4125,1.3735,0,0.8856,2.4811,-1.5798,1] },
}

// パーツの名前（#番号の前）→ [形, 輪郭線]
const SHAPES = {
  '頭': [headGeo, true], '目': [eyeGeo, false], '翼': [wingGeo, true], '尾羽': [wingGeo, true],
  'くちばし': [beakGeo, false], 'ひし形': [beakGeo, false],
}
const plain = geo => {
  const g = geo.index ? geo.clone() : mergeVertices(geo.clone(), 1e-6)
  for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k)
  return g
}
const paint = (geo, c) => {
  const n = geo.attributes.position.count, col = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  return geo
}
const partsOf = () => Object.entries(BIRD_LAYOUT).map(([key, { color, m }]) => {
  const [geo, outline] = SHAPES[key.split('#')[0]]
  return { key, make: geo, outline, color, M: new THREE.Matrix4().fromArray(m) }
})

// 作業台の座標での外形（足の下の端・全長を出すため）
const BOX = (() => {
  const box = new THREE.Box3()
  for (const { make, M } of partsOf()) { const g = make().applyMatrix4(M); g.computeBoundingBox(); box.union(g.boundingBox) }
  return box
})()
export const BIRD_LENGTH = BOX.max.z - BOX.min.z   // モデル単位の全長

// 形とマテリアル（createBird と createBirdInstances で共通）。座標は作業台の座標から、足の下の端を原点へ寄せたもの
function buildBird(glow, colors = null) {
  const offset = new THREE.Vector3(-(BOX.min.x + BOX.max.x) / 2, -BOX.min.y, 0)   // 足の下の端を原点へ（左右は真ん中）
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow, glow, glow) })
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;')
  }
  const lineMat = new THREE.MeshBasicMaterial({ color: BIRD.LINE, side: THREE.BackSide })
  const T = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z)
  const body = [], bodyLines = [], wings = []
  for (const { key, make, outline, color, M } of partsOf()) {
    const MT = T.clone().multiply(M)
    const geo = make()
    const g = paint(plain(geo).applyMatrix4(MT), new THREE.Color(colors?.[key.split('#')[0]] ?? color))
    g.computeVertexNormals()
    const line = outline ? outlineGeo(geo, BIRD.OUTLINE).applyMatrix4(MT) : null
    if (key.startsWith('翼')) wings.push({ key, g, line })
    else { body.push(g); if (line) bodyLines.push(line) }
  }
  // 翼：体に近い側の端（pivot）を原点にした形にする（羽ばたきの軸）
  for (const w of wings) {
    w.g.computeBoundingBox()
    const box = w.g.boundingBox, c = box.getCenter(new THREE.Vector3())
    w.sign = c.x >= 0 ? 1 : -1
    w.pivot = new THREE.Vector3(w.sign > 0 ? box.min.x : box.max.x, c.y, c.z)
    w.g.translate(-w.pivot.x, -w.pivot.y, -w.pivot.z); w.line.translate(-w.pivot.x, -w.pivot.y, -w.pivot.z)
  }
  return { mat, lineMat, body: mergeGeometries(body), bodyLine: mergeGeometries(bodyLines), wings }
}

export function createBird({ length = null, glow = BIRD.GLOW, colors = null } = {}) {
  const root = new THREE.Group(); root.name = 'bird'
  const { mat, lineMat, body, bodyLine, wings } = buildBird(glow, colors)
  const bodyMesh = new THREE.Mesh(body, mat); bodyMesh.name = '体'
  const bodyLineMesh = new THREE.Mesh(bodyLine, lineMat); bodyLineMesh.name = '体(線)'; bodyLineMesh.userData.outline = true
  root.add(bodyMesh, bodyLineMesh)
  root.userData.wings = wings.map(({ key, g, line, pivot, sign }) => {
    const grp = new THREE.Group(); grp.name = key; grp.position.copy(pivot); grp.userData.sign = sign
    const m = new THREE.Mesh(g, mat); m.name = key
    const o = new THREE.Mesh(line, lineMat); o.name = key + '(線)'; o.userData.outline = true
    grp.add(m, o); root.add(grp)
    return grp
  })
  if (length) root.scale.setScalar(length / BIRD_LENGTH)
  return root
}

// たくさんの鳥をまとめて描く（インスタンス描画）。鳥が何羽でも描画は 6 回（体・体の線・翼 2 枚とその線）
//   createBirdInstances(count, { length, glow, outline, colors }) → { group, set(i, matrix, th), commit() }
//     outline: false で輪郭線なし（描画 3 回）
//     set: i 羽目を、matrix（鳥の原点 = 足の下の端・+z が正面の、世界での行列。大きさは length で決まるので入れない）に置き、翼を th [rad] 上げる
//     commit: set し終えたら呼ぶ（GPU へ送る）
//   画面の外でも描く（frustumCulled = false。鳥が星じゅうに散らばるので、まとめた外接球では外せない）
export function createBirdInstances(count, { length = 1, glow = BIRD.GLOW, outline = true, colors = null } = {}) {
  const { mat, lineMat, body, bodyLine, wings } = buildBird(glow, colors)
  const k = length / BIRD_LENGTH
  const S = new THREE.Matrix4().makeScale(k, k, k)
  const group = new THREE.Group(); group.name = 'birds'
  const make = (geo, m, name) => {
    const im = new THREE.InstancedMesh(geo, m, count); im.name = name
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    group.add(im); return im
  }
  const bodyIM = make(body, mat, '体'), bodyLineIM = outline ? make(bodyLine, lineMat, '体(線)') : null
  const wingIMs = wings.map(w => ({ ...w, m: make(w.g, mat, w.key), l: outline ? make(w.line, lineMat, w.key + '(線)') : null }))
  const _M = new THREE.Matrix4(), _W = new THREE.Matrix4(), _R = new THREE.Matrix4()
  return {
    group,
    set(i, matrix, th = 0) {
      _M.multiplyMatrices(matrix, S)
      bodyIM.setMatrixAt(i, _M); bodyLineIM?.setMatrixAt(i, _M)
      for (const w of wingIMs) {
        _W.copy(_M).multiply(_R.makeTranslation(w.pivot.x, w.pivot.y, w.pivot.z)).multiply(_R.makeRotationZ(w.sign * th))
        w.m.setMatrixAt(i, _W); w.l?.setMatrixAt(i, _W)
      }
    },
    commit() {
      for (const im of group.children) im.instanceMatrix.needsUpdate = true
    },
  }
}

// 羽ばたき：翼を前後の軸（z）まわりに th [rad] 上げる（+x 側は +th、-x 側は -th で、どちらも先が上がる）
export function createBirdFlap(root) {
  const wings = root.userData.wings || []
  return {
    update(th) { for (const w of wings) w.rotation.z = w.userData.sign * th },
    stop() { for (const w of wings) w.rotation.z = 0 },
  }
}
