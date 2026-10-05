import * as THREE from 'three';

// 階段の館（kaidan_palace）— workspace/kaidan_palace.html と同じ形
// 3段の階段の形をした建物。段は厚い板を前から順に重ねたもので、下は空洞（背面が開いている）
// 四隅に円筒の柱：前の2本は1段目の高さ、後ろの2本は最上段の高さ。1段目の正面に小さな両開き扉
// 原点 = 底面の中心、+z が正面（低い側）、単位 1 = 1m
const KAIDAN={
  STEP_H:1.0,              // 1段の高さ（= 板の厚み）
  TREADS:[1.45,1.45,1.8],  // 各段の踏み面の奥行き（前から）
  W:3.6,                   // 幅
  LAP:0.35,                // 板が次の段の下へ潜り込む長さ
  WALL:0.27,               // 空洞の左右の壁の厚み
  COL_R:0.2,               // 円筒の柱の半径
  COL_IN:0.1,              // 円筒の柱を本体の角から内側（x・z とも）へ寄せる量
  DOOR:{x:0.58,w:0.76,h:0.57},  // 扉（左端からの位置・幅・高さ）
};
const kaidanMat=new THREE.MeshStandardMaterial({color:0x9c9d9a,roughness:0.95});
const kaidanDoorMat=new THREE.MeshStandardMaterial({color:0x3a3d42,roughness:0.8});
const kaidanLineMat=new THREE.LineBasicMaterial({color:0x111214});

// メッシュ（輪郭線は階段状の角だけ別に引く）
function kaidanMesh(geo,mat){
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;   // 自分の影は受けない（看板・柵と同じ）
  return mesh;
}

// 横から見た輪郭 pts（[奥行き, 高さ]、奥行き 0 = 正面）を幅方向 x0〜x1 へ押し出す
function kaidanExtrude(pts,x0,x1){
  const K=KAIDAN, D=K.TREADS.reduce((a,b)=>a+b,0);
  const shape=new THREE.Shape(pts.map(([s,y])=>new THREE.Vector2(s,y)));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:x1-x0,bevelEnabled:false});
  geo.translate(0,0,x0);
  geo.rotateY(Math.PI/2);          // 奥行き s → -z、幅 → +x
  geo.translate(-K.W/2,0,D/2);     // 底面の中心を原点に
  return geo;
}

export function createKaidanPalace(){
  const K=KAIDAN, H=K.STEP_H, W=K.W;
  const D=K.TREADS.reduce((a,b)=>a+b,0);
  const group=new THREE.Group();
  group.name='階段の館';

  // 各段の前端の奥行き位置
  const front=[0];
  K.TREADS.forEach(t=>front.push(front[front.length-1]+t));
  const n=K.TREADS.length;

  // 段の板の重なり（外形 = 階段、内側 = 空洞の天井）を1枚の輪郭にする
  const outer=[[0,0]], inner=[];
  for(let i=0;i<n;i++){
    outer.push([front[i],(i+1)*H]);
    outer.push([front[i+1],(i+1)*H]);
  }
  outer.push([D,(n-1)*H]);
  for(let i=n-2;i>=0;i--){
    inner.push([front[i+1]+K.LAP,(i+1)*H]);
    inner.push([front[i+1]+K.LAP,i*H]);
  }
  // 1段目は地面まで（正面は閉じている）、背面は空洞が開く
  const shell=outer.concat(inner);
  group.add(kaidanMesh(kaidanExtrude(shell,0,W),kaidanMat));

  // 階段状の角だけ輪郭線を引く：段の角を幅いっぱいに横切る線と、左右の側面の階段の形
  const steps=outer.slice(1,1+2*n);   // 1段目の前の上端 〜 最上段の後ろの上端
  const at=([s,y],x)=>[x-W/2,y,D/2-s];
  const lv=[];
  steps.forEach(p=>lv.push(...at(p,0),...at(p,W)));
  for(let i=0;i<steps.length-1;i++)[0,W].forEach(x=>lv.push(...at(steps[i],x),...at(steps[i+1],x)));
  const lineGeo=new THREE.BufferGeometry();
  lineGeo.setAttribute('position',new THREE.Float32BufferAttribute(lv,3));
  group.add(new THREE.LineSegments(lineGeo,kaidanLineMat));

  // 空洞の左右の壁（空洞の輪郭を壁の厚みだけ押し出す）
  const hollow=[[front[1]+K.LAP,0]];
  for(let i=0;i<n-1;i++){
    hollow.push([front[i+1]+K.LAP,(i+1)*H]);
    hollow.push([i<n-2?front[i+2]+K.LAP:D,(i+1)*H]);
  }
  hollow.push([D,0]);
  group.add(kaidanMesh(kaidanExtrude(hollow,0,K.WALL),kaidanMat));
  group.add(kaidanMesh(kaidanExtrude(hollow,W-K.WALL,W),kaidanMat));

  // 四隅の円筒の柱（中心は本体の角から少し内側）。前は1段目の高さ、後ろは最上段の高さ
  [[D/2-K.COL_IN,H],[-D/2+K.COL_IN,n*H]].forEach(([z,h])=>{
    [-W/2+K.COL_IN,W/2-K.COL_IN].forEach(x=>{
      const geo=new THREE.CylinderGeometry(K.COL_R,K.COL_R,h,32);
      const col=kaidanMesh(geo,kaidanMat);
      col.position.set(x,h/2,z);
      group.add(col);
    });
  });

  // 1段目の正面の両開き扉
  const dr=K.DOOR, dt=0.03;
  for(let i=0;i<2;i++){
    const geo=new THREE.BoxGeometry(dr.w/2,dr.h,dt);
    const leaf=kaidanMesh(geo,kaidanDoorMat);
    leaf.position.set(-W/2+dr.x+dr.w/4+i*dr.w/2,dr.h/2,D/2+dt/2);
    group.add(leaf);
  }

  group.userData.footprint={halfW:W/2-K.COL_IN+K.COL_R,halfD:D/2-K.COL_IN+K.COL_R};  // 当たり判定用（ローカル XZ の矩形。柱まで含める）
  return group;
}

export const KAIDAN_PALACE=KAIDAN;   // 寸法
