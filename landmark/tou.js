import * as THREE from 'three';

// 塔（tou）— workspace/tou.html と同じ形。原点 = 底面中心、単位 1 = 1m
// 平面は 3x3 グリッド: 四隅が低い角ブロック、各辺の中央が高いブロック、中央に円筒 + 円錐屋根
// 角 (+x,+z) のブロックは角を四角く切り欠き、内側の2面に扉を付ける
export function createTou(){
  const W=9;                 // 外形の一辺
  const C=3.2;               // 角ブロックの一辺（中央セルの幅は W-2C）
  const H_CORNER=2.0;        // 角ブロックの高さ
  const H_EDGE=4.6;          // 辺の中央ブロックの高さ
  const CYL_R=2.7, H_CYL=5.6;      // 中央の円筒
  const CONE_R=2.75, H_CONE=5.0;   // 屋根の円錐
  const NOTCH=1.6;           // 扉の入り隅の切り欠きサイズ
  const DOOR_H=2.0;          // 扉の高さ
  const BASE_Y=2;            // 基壇の高さの基準（ここから H_CORNER / H_EDGE 分立ち上がる）
  const GROUND_Y=0;          // 地面の高さ。基壇はここまで下に伸ばす
  const EXT=BASE_Y-GROUND_Y; // 基壇を下に伸ばす量
  const h=W/2, m=h-C;        // m: 中央セルの半幅

  const group=new THREE.Group();
  group.name='塔';
  const wallMat=new THREE.MeshStandardMaterial({color:0xf2efe8,roughness:0.9,flatShading:true});
  const roofMat=new THREE.MeshStandardMaterial({color:0xa08a85,roughness:0.8});
  const curveMat=new THREE.MeshStandardMaterial({color:0xf2efe8,roughness:0.9});  // 円筒用（なめらかな陰影）
  const doorMat=new THREE.MeshStandardMaterial({color:0x6b5a50,roughness:0.7,flatShading:true});
  function add(geo,mat,x,y,z){
    const mesh=new THREE.Mesh(geo,mat);
    mesh.position.set(x,y,z); mesh.castShadow=true;  // 影は地面に落とすだけ。塔自身は受けない（低解像度の影マップで入り隅がガビガビになるため）
    group.add(mesh);
    return mesh;
  }
  // 基壇のブロック: 上面は BASE_Y+H、下面は地面まで
  function block(w,H,d,x,z){
    return add(new THREE.BoxGeometry(w,H+EXT,d),wallMat,x,GROUND_Y+(H+EXT)/2,z);
  }

  // 四隅の低いブロック
  [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([sx,sz])=>{
    if(sx===1&&sz===1){
      // 扉側: 外角を NOTCH 分切り欠いた L 字（Shape の (x,y) → ワールド (x,-z)）
      const s=new THREE.Shape([
        new THREE.Vector2(m,-m), new THREE.Vector2(h,-m), new THREE.Vector2(h,-(h-NOTCH)),
        new THREE.Vector2(h-NOTCH,-(h-NOTCH)), new THREE.Vector2(h-NOTCH,-h), new THREE.Vector2(m,-h),
      ]);
      const geo=new THREE.ExtrudeGeometry(s,{depth:H_CORNER+EXT,bevelEnabled:false});
      geo.rotateX(-Math.PI/2);
      add(geo,wallMat,0,GROUND_Y,0);
    }else{
      block(C,H_CORNER,C,sx*(m+C/2),sz*(m+C/2));
    }
  });

  // 辺の中央の高いブロック
  const mid=2*m;
  block(mid,H_EDGE,C,0, (m+C/2));
  block(mid,H_EDGE,C,0,-(m+C/2));
  block(C,H_EDGE,mid, (m+C/2),0);
  block(C,H_EDGE,mid,-(m+C/2),0);

  // 中央の床（中央セルを埋める）
  block(mid,H_CORNER,mid,0,0);

  // 土台に重ねる板（下面 y=-2）: 土台と同じ外形の正方形（扉の切り欠きなし）
  const SLAB_Y=3, SLAB_T=1, SLAB_W=W+0.2;   // 土台より 0.2 大きく、四方に 0.1 ずつはみ出す
  add(new THREE.BoxGeometry(SLAB_W,SLAB_T,SLAB_W),wallMat,0,SLAB_Y+SLAB_T/2,0);

  // 中央の円筒と円錐屋根
  add(new THREE.CylinderGeometry(CYL_R,CYL_R,H_CYL,12),curveMat,0,BASE_Y+H_CYL/2,0);
  add(new THREE.ConeGeometry(CONE_R,H_CONE,12),roofMat,0,BASE_Y+H_CYL+H_CONE/2,0);

  // 扉: 入り隅の内側2面に1枚ずつ（地面から立ち上げる）
  // 外側の辺（蝶番）は切り欠きの縁から 0.1*NOTCH 内側。各扉を蝶番まわりに 45° 回し、
  // 2 枚を対角線上で一直線（180°）に並べて中央で突き合わせる（両開き）
  const DOOR_T=0.06, DOOR_GAP=0.02, inner=h-NOTCH, outer=h-NOTCH*0.1;
  const seam=(inner+outer)/2;                                      // 対角線の中点（扉の合わせ目）
  const DOOR_W=Math.SQRT2*(outer-inner)/2-DOOR_GAP/2;               // 蝶番から合わせ目までの長さ
  const DOOR_INSET=0.2;                                             // 扉を建物中心へ寄せる距離（対角線方向）
  const nOff=-(DOOR_T/2+DOOR_INSET)/Math.SQRT2;                     // 扉の外面を対角線から DOOR_INSET 奥へ
  [[outer,inner],[inner,outer]].forEach(([hx,hz])=>{
    const door=add(new THREE.BoxGeometry(DOOR_W,DOOR_H,DOOR_T),doorMat,(hx+seam)/2+nOff,GROUND_Y+DOOR_H/2,(hz+seam)/2+nOff);
    door.rotation.y=Math.PI/4;
  });

  // 扉の裏の壁: 入り隅と扉の裏面のあいだを直角二等辺三角柱で埋める（地面〜板の下面）
  // 扉の裏面は x+z=K の直線（蝶番を結ぶ対角線から DOOR_INSET+DOOR_T 奥）
  const K=inner+outer-Math.SQRT2*(DOOR_INSET+DOOR_T);
  const tri=new THREE.Shape([
    new THREE.Vector2(inner,-inner), new THREE.Vector2(K-inner,-inner), new THREE.Vector2(inner,-(K-inner)),
  ]);
  const triGeo=new THREE.ExtrudeGeometry(tri,{depth:SLAB_Y-GROUND_Y,bevelEnabled:false});
  triGeo.rotateX(-Math.PI/2);
  add(triGeo,wallMat,0,GROUND_Y,0);

  group.userData.footprint={halfW:h,halfD:h};  // 当たり判定用（ローカル XZ の矩形）
  return group;
}
