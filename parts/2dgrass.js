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
