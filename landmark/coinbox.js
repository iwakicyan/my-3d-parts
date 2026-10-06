import * as THREE from 'three';

// コイン箱（coinbox）— workspace/coinbox.html と同じ形
// 茶色の四角い台の上に、前が斜めに傾いた金色の箱を載せる。斜めの面に丸い投入口（円盤 + 縦のスロット）
// 原点 = 台の底面の中心、+z が正面、単位 1 = 1m
const COINBOX={
  BASE:{w:0.7,h:0.6,d:0.7},   // 台（幅・高さ・奥行き）
  INSET:0.02,                 // 金の箱を台の縁から内側へ寄せる量
  FRONT_H:0.13,               // 金の箱の正面の垂直な部分の高さ
  H:0.48,                     // 金の箱の高さ
  TOP_D:0.17,                 // 金の箱の天面の奥行き（残りが斜めの面）
  DISC:{r:0.2,t:0.04,seg:12, bowlR:0.08,bowlD:0.03,bowlSeg:10,bowlRot:18,bowlRings:4},   // 投入口の円盤（半径・厚み・周囲の分割数、中心のくぼみの半径・深さ・周囲の分割数・回転[度]・縁から中心への分割数）
  SLOT:{w:0.033,l:0.225},      // 縦のスロット（幅・長さ）
};
const coinboxBaseMat=new THREE.MeshStandardMaterial({color:0x9a8672,roughness:0.9,emissive:0x1e1712});
const coinboxGoldMat=new THREE.MeshStandardMaterial({color:0xe2b862,roughness:0.4,emissive:0x6a4c18});
const coinboxSlotMat=new THREE.MeshStandardMaterial({color:0x22262c,roughness:0.7});
const coinboxLineMat=new THREE.LineBasicMaterial({color:0x2b3640});

// メッシュ + 輪郭線（edge は線にする角度のしきい値。false で線なし）
function coinboxMesh(geo,mat,edge=20){
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;
  if(edge)mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,edge),coinboxLineMat));
  return mesh;
}

export function createCoinbox(){
  const C=COINBOX, B=C.BASE;
  const group=new THREE.Group();
  group.name='コイン箱';

  // 台
  const base=coinboxMesh(new THREE.BoxGeometry(B.w,B.h,B.d),coinboxBaseMat);
  base.position.y=B.h/2;
  group.add(base);

  // 金の箱：横から見た輪郭（[z, y]、z は前が +）を幅方向へ押し出す
  const W=B.w-2*C.INSET, D=B.d-2*C.INSET;
  const zf=D/2, zb=-D/2, zt=zb+C.TOP_D;
  const prof=[[zf,0],[zf,C.FRONT_H],[zt,C.H],[zb,C.H],[zb,0]];
  // Shape は (x, y) 平面。x = -z として押し出し、あとで Y 軸まわりに回して幅を x に向ける
  const shape=new THREE.Shape(prof.map(([z,y])=>new THREE.Vector2(-z,y)));
  const goldGeo=new THREE.ExtrudeGeometry(shape,{depth:W,bevelEnabled:false});
  goldGeo.translate(0,0,-W/2);
  goldGeo.rotateY(Math.PI/2);    // shape の x(= -z) → z、押し出し方向 → x
  const gold=coinboxMesh(goldGeo,coinboxGoldMat);
  gold.position.y=B.h;
  group.add(gold);

  // 斜めの面に沿った座標系：ローカル +z が面の法線、+y が面に沿って上
  const run=zf-zt, rise=C.H-C.FRONT_H, a=Math.atan2(rise,run);
  const face=new THREE.Group();
  face.position.set(0,B.h+(C.FRONT_H+C.H)/2,(zf+zt)/2);
  face.rotation.x=-(Math.PI/2-a);
  group.add(face);

  // 投入口：中心を球面で丸くえぐった円盤 + 縦のスロット（面に沿って上下に向く）
  const dc=C.DISC;
  const sphR=(dc.bowlR*dc.bowlR+dc.bowlD*dc.bowlD)/(2*dc.bowlD);   // くぼみの球の半径
  const bowlZ=r=>r>=dc.bowlR?dc.t:dc.t-dc.bowlD+sphR-Math.sqrt(sphR*sphR-r*r);   // 中心から r の所の表面の高さ（くぼみの外は平ら）
  // 円盤とくぼみで周囲の分割数が違うので、側面・平らな表面・くぼみを別々に作る
  // LatheGeometry の頂点は (r·sinφ, h, r·cosφ)。回転軸 y を面の法線 z へ回すと (r·sinφ, -r·cosφ, h) になる
  // rot は面の法線まわりの回転（ラジアン）
  const ngon=(r,n,rot=0)=>Array.from({length:n},(_,i)=>{const f=i/n*Math.PI*2+rot;return new THREE.Vector2(r*Math.sin(f),-r*Math.cos(f));});
  const lathe=(pts,n,rot=0)=>{
    const geo=new THREE.LatheGeometry(pts,n);   // 下から上へ並べると面が外を向く
    geo.rotateX(Math.PI/2);   // 回転軸 y → 面の法線 z
    geo.rotateZ(rot);
    return geo;
  };
  const bowlRot=THREE.MathUtils.degToRad(dc.bowlRot);
  // 側面（分割の縦線は出さない）
  face.add(coinboxMesh(lathe([new THREE.Vector2(dc.r,0),new THREE.Vector2(dc.r,dc.t)],dc.seg),coinboxGoldMat,45));
  // 平らな表面：外は円盤の多角形、内はくぼみの多角形の穴
  const top=new THREE.Shape(ngon(dc.r,dc.seg));
  top.holes.push(new THREE.Path(ngon(dc.bowlR,dc.bowlSeg,bowlRot)));
  const topGeo=new THREE.ShapeGeometry(top);
  topGeo.translate(0,0,dc.t);
  face.add(coinboxMesh(topGeo,coinboxGoldMat));
  // くぼみ：縁から中心へ下りていく球面
  const bowlProf=[];
  for(let i=dc.bowlRings;i>=0;i--){const r=dc.bowlR*i/dc.bowlRings;bowlProf.push(new THREE.Vector2(r,bowlZ(r)));}
  face.add(coinboxMesh(lathe(bowlProf,dc.bowlSeg,bowlRot),coinboxGoldMat,40));
  // スロットはくぼみの面に沿わせて折った板
  // くぼみは多角形なので、点の向きでの多角形の縁までの距離で r を割り戻してから高さを求める
  const sl=C.SLOT, seg=Math.PI*2/dc.bowlSeg;
  const edgeAt=(x,y)=>{
    const f=Math.atan2(x,-y)-bowlRot;
    const rel=((f%seg)+seg)%seg-seg/2;   // いちばん近い辺の中点からの角度
    return Math.cos(seg/2)/Math.cos(rel);   // 縁までの距離 / bowlR
  };
  const surfZ=(x,y)=>bowlZ(Math.hypot(x,y)/edgeAt(x,y));
  // 折り目はくぼみの各リングを横切る所だけ。縁から外の平らな部分は端まで1枚
  const ys=[-sl.l/2,0,sl.l/2];
  for(let i=1;i<=dc.bowlRings;i++){
    const r=dc.bowlR*i/dc.bowlRings;
    [-1,1].forEach(s=>{const y=s*r*edgeAt(0,s);if(Math.abs(y)<sl.l/2)ys.push(y);});
  }
  ys.sort((a,b)=>a-b);
  const sv=[], si=[];
  ys.forEach((y,j)=>{
    [-sl.w/2,sl.w/2].forEach(x=>sv.push(x,y,surfZ(x,y)+0.003));
    if(j>0)si.push(2*j-2,2*j-1,2*j+1, 2*j-2,2*j+1,2*j);
  });
  const slotGeo=new THREE.BufferGeometry();
  slotGeo.setAttribute('position',new THREE.Float32BufferAttribute(sv,3));
  slotGeo.setIndex(si);
  slotGeo.computeVertexNormals();
  face.add(coinboxMesh(slotGeo,coinboxSlotMat,false));

  group.userData.footprint={halfW:B.w/2,halfD:B.d/2};  // 当たり判定用（ローカル XZ の矩形）
  return group;
}

export const COINBOX_SIZE=COINBOX;   // 寸法
