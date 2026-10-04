import * as THREE from 'three';

// 2dgrass — 板ポリ3枚（山1つ・2つ・3つ）を束ねた草の房。workspace/2dgrass.html と同じ形
// 原点 = 根元の中心（地面 y=0）。板は縦に1.5倍伸ばしてあり、下の部分は地面にめり込ませて使う

// 板の輪郭（x,y とも 0〜1 の正規化座標）。UVにもそのまま使う
const SHAPES = [
  { // 山1つ：3頂点
    pts: [[0, 0], [0.5, 1], [1, 0]],
    tris: [[0, 2, 1]],
  },
  { // 山2つ：5頂点
    pts: [[0, 0], [0.25, 0.9], [0.5, 0.45], [0.78, 1], [1, 0]],
    tris: [[0, 2, 1], [2, 4, 3], [0, 4, 2]],
  },
  { // 山3つ：7頂点
    pts: [[0, 0], [0.16, 0.8], [0.33, 0.4], [0.5, 1], [0.67, 0.45], [0.84, 0.85], [1, 0]],
    tris: [[0, 2, 1], [2, 4, 3], [4, 6, 5], [0, 4, 2], [0, 6, 4]],
  },
];

// 各板の配置（角度・横ずれ・大きさ・傾き）。ここをいじると房の表情が変わる
const TILT = THREE.MathUtils.degToRad(10);
const STRETCH = 1.5; // 縦に伸ばす倍率。伸ばした分は地面の下にめり込ませ、傾けても根元が浮かないようにする
const PLACEMENTS = [
  { angle: 0,                  ox: 0.25, oz: 0.00, w: 0.125, h: 0.55, tiltX: TILT, tiltZ: TILT },
  { angle: THREE.MathUtils.degToRad(50),  ox: 0.06, oz: -0.04, w: 0.45, h: 0.7,  tiltX: TILT, tiltZ: TILT },
  { angle: THREE.MathUtils.degToRad(115), ox: -0.05, oz: 0.05, w: 0.55, h: 0.45, tiltX: TILT, tiltZ: TILT },
];

// 1房ぶんのジオメトリ（15頂点・インデックス付き）
export function createGrassTuftGeometry() {
  const pos = [], uv = [], idx = [];
  let base = 0;

  SHAPES.forEach((shape, i) => {
    const { angle, ox, oz, w, h, tiltX = 0, tiltZ = 0 } = PLACEMENTS[i];
    const c = Math.cos(angle), s = Math.sin(angle);
    const tilt = new THREE.Euler(tiltX, 0, tiltZ); // 根元を支点にX軸・Z軸で傾ける
    const p = new THREE.Vector3();

    for (const [u, v] of shape.pts) {
      p.set((u - 0.5) * w, (v * STRETCH - (STRETCH - 1)) * h, 0).applyEuler(tilt); // 板の中央を原点に。地上に出る高さは h のまま
      pos.push(p.x * c + p.z * s + ox, p.y, -p.x * s + p.z * c + oz); // Y軸回転＋オフセット
      uv.push(u, v);
    }
    for (const t of shape.tris) idx.push(base + t[0], base + t[1], base + t[2]);
    base += shape.pts.length;
  });

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// 64x64のテクスチャ画像（PNGをdata URIで埋め込み。パーツ単体で完結させるため）
const GRASS_TEX_URL = 'data:image/png;base64,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';
export function createGrassTexture() {
  const tex = new THREE.TextureLoader().load(GRASS_TEX_URL);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  return tex;
}

// 草のマテリアル：テクスチャ自身を発光にも使い、光が当たらない面でも暗くなりすぎないようにする
export function createGrassMaterial() {
  const tex = createGrassTexture();
  return new THREE.MeshLambertMaterial({
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 0.6,
    side: THREE.DoubleSide, // alphaTest / transparent は不要
  });
}

// 1房（原点 = 根元の中心・地面 y=0、地上の高さ約0.7。y<0 は地面にめり込ませる部分）
export function create2DGrass() {
  const mesh = new THREE.Mesh(createGrassTuftGeometry(), createGrassMaterial());
  mesh.name = '2dgrass';
  return mesh;
}

// 敷き詰め用InstancedMesh（positions: THREE.Vector3[]）
export function create2DGrassField(positions) {
  const mat = createGrassMaterial();
  const mesh = new THREE.InstancedMesh(createGrassTuftGeometry(), mat, positions.length);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const sc = new THREE.Vector3();

  positions.forEach((p, i) => {
    q.setFromAxisAngle(up, Math.random() * Math.PI * 2); // 向きはランダム
    const k = 0.8 + Math.random() * 0.5;                 // 大きさも少しランダム
    m.compose(p, q, sc.set(k, k, k));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
