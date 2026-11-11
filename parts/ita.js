import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================================
//  板 — 手描きスケッチから作業台 workspace/ita.html で形を整えた木の板
//  createIta({ width })
//    原点=板の下の辺の真ん中・+y が上・+z が正面。width (m) を渡すとその横幅に縮める（渡さなければモデル単位。横幅 ITA_WIDTH）
//    板（茶。左に 1 つ・右に 2 つ V 字の切れこみ）・木目（濃い茶の細い線。表と裏）・輪郭線（濃い茶の裏返しの殻）
//    動かないので、板と木目は 1 つのメッシュにまとめる（色は頂点の色。自発光も頂点の色 × glow でスケッチのような平たい色）
//    userData.footprint に当たり判定の箱（halfW・halfD。モデル単位）を入れる
//    作業台ではどのパーツも動かしていないので、配置はジオメトリを作ったそのまま
// ============================================================

export const ITA = { GLOW: 0.45, WOOD: '#8f7b63', LINE: '#4a3626' };

const S = 0.004;   // スケッチの画素 → モデル単位（1280 四方・板の真ん中は x=630、下の辺は y=1065）
const X = px => (px - 630) * S, Y = py => (1065 - py) * S;
const T = 36 * S;   // 板の厚み
const OUTLINE_W = 5 * S;   // 輪郭線の太さ

// 外形（スケッチの画素）。左に 1 つ・右に 2 つ V 字の切れこみ
const OUTLINE_PTS = [
  [150, 1065], [1105, 1060],                            // 下の辺
  [1105, 875], [995, 850], [1108, 832],                 // 右下の切れこみ
  [1120, 700], [1124, 522], [1035, 516], [1124, 500],   // 右上の切れこみ
  [1132, 420], [1112, 372],                             // 右上の角（少し丸い）
  [640, 360], [150, 364],                               // 上の辺
  [152, 545], [320, 563], [150, 578],                   // 左の切れこみ
];
// 木目（始点・終点の画素）。最後は上のふちの二重線
const GRAINS = [
  [[485, 628], [1070, 648]], [[357, 710], [888, 712]],
  [[155, 453], [225, 456]], [[160, 808], [235, 807]],
  [[155, 953], [345, 956]], [[167, 980], [415, 981]],
  [[160, 383], [1110, 378]],
];

export const ITA_WIDTH = X(1132) - X(150);

function boardGeometry() {
  const sh = new THREE.Shape(OUTLINE_PTS.map(([x, y]) => new THREE.Vector2(X(x), Y(y))));
  return new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }).translate(0, 0, -T / 2);
}

// 木目 1 本：両端がとがった平たい線。表（+z）と裏（-z）に貼る
function grainGeometries() {
  const out = [];
  for (const [[x0, y0], [x1, y1]] of GRAINS) {
    const a = new THREE.Vector2(X(x0), Y(y0)), b = new THREE.Vector2(X(x1), Y(y1));
    const len = a.distanceTo(b), w = 5 * S, th = Math.atan2(b.y - a.y, b.x - a.x);
    const s = new THREE.Shape([
      new THREE.Vector2(0, 0), new THREE.Vector2(len * 0.1, w / 2), new THREE.Vector2(len * 0.9, w / 2),
      new THREE.Vector2(len, 0), new THREE.Vector2(len * 0.9, -w / 2), new THREE.Vector2(len * 0.1, -w / 2),
    ]);
    for (const sz of [1, -1]) {
      const o = new THREE.Object3D();
      o.position.set(a.x, a.y, sz * (T / 2 + 0.002));
      if (sz > 0) o.rotation.z = th; else o.rotation.set(0, Math.PI, Math.PI - th);   // 裏は裏向きにして同じ所をなぞる
      o.updateMatrix();
      out.push(new THREE.ShapeGeometry(s).applyMatrix4(o.matrix));
    }
  }
  return out;
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

// 板を法線の向きへ w ふくらませた形（輪郭線・光る輪郭に使う）
export function itaInflatedGeometry(w) {
  const g = boardGeometry();
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * w, p.getY(i) + n.getY(i) * w, p.getZ(i) + n.getZ(i) * w);
  return g;
}
// 板の外形を w ふくらませた形の辺（木目は入れない。光る輪郭の線に使う。板の面と重ならないよう少しふくらませる）
export const itaEdgesGeometry = (w = OUTLINE_W * 1.5) => new THREE.EdgesGeometry(itaInflatedGeometry(w), 30);

// 表（+z）で字を書ける範囲（モデル単位。切れこみと下のふちの木目をよけた四角）
export const ITA_FACE = { x0: X(210), x1: X(1050), y0: Y(1000), y1: Y(400), z: T / 2 + 0.004 };

export function createIta({ width = null, glow = ITA.GLOW } = {}) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(glow, glow, glow) });
  mat.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = emissive * vColor;');
  };
  const wood = new THREE.Color(ITA.WOOD), line = new THREE.Color(ITA.LINE);
  const mesh = new THREE.Mesh(mergeGeometries([paint(boardGeometry(), wood), ...grainGeometries().map(g => paint(g, line))]), mat);
  mesh.name = '板'; mesh.castShadow = true;
  const outline = new THREE.Mesh(itaInflatedGeometry(OUTLINE_W), new THREE.MeshBasicMaterial({ color: line, side: THREE.BackSide }));
  outline.name = '板の輪郭線'; outline.userData.outline = true;
  mesh.add(outline);
  const root = new THREE.Group(); root.name = 'ita';
  root.add(mesh);
  root.userData.footprint = { halfW: ITA_WIDTH / 2, halfD: T / 2 };   // 当たり判定の箱（モデル単位。ローカル XZ の半分の幅・奥行き）
  if (width) root.scale.setScalar(width / ITA_WIDTH);
  return root;
}
