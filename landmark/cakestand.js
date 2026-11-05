import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ケーキスタンド（cakestand）— workspace/cakestand.html と同じ形
// 2 段のケーキスタンド。灰色の丸い台座からラッパ形の脚が細い軸になって立ち上がり、
// 軸から枝分かれした支えで大小 2 枚の皿を受ける。皿にはそれぞれ丸いケーキ、てっぺんに輪を 4 枚組んだ飾り
// 原点 = 台座の底の中心、+z が正面（どの向きも同じ形）、単位 1 = 1m
const CAKESTAND={
  FOOT:{r:1.2,h:0.15},                       // 台座（半径・厚み）
  STEM:{r0:0.7,r1:0.07,h:1.5},               // ラッパ形の脚（下の半径・上の半径・高さ）
  ROD:{r:0.06},                              // 軸の半径
  TIERS:[                                    // 皿とケーキ（下から）。y = 皿の上面の高さ
    {y:2.2, plate:2.4, lip:0.15, cake:{r:1.6,h:0.6},  arm:{y:1.75,r:0.55}},
    {y:3.8, plate:1.8, lip:0.12, cake:{r:1.0,h:0.55}, arm:{y:3.1, r:0.45}},
  ],
  PLATE_T:0.06,                              // 皿の厚み
  ARM:{r:0.035,n:4},                         // 支えの枝（半径・本数）
  TOP:{h:0.55,loop:{r:0.26,tube:0.05,out:0.2,tilt:0.25,n:4}},  // 飾り（軸の長さ・輪の大きさ・太さ・軸から離す量・外への傾き・枚数）
  SEG:16,                                    // 丸いものの分割数
  COLOR:{stand:0x9ea5a8,plate:0xeef0f0,under:0x000000,cake:0xfbf8f2,line:0x2a2d33},   // under は皿の裏（床を向いた面）
};

// 皿: 平らな円盤の縁 lip だけ外へ反り上がる（上面の高さが原点）
// { top: 上面と縁, under: 裏（床を向いた面。色を変えるので分ける） } を返す
function plateGeo(r,lip,t){
  const flat=r*0.82;
  const lathe=pts=>new THREE.LatheGeometry(pts.map(([x,y])=>new THREE.Vector2(x,y)),CAKESTAND.SEG);
  return {
    under:lathe([[0,-t],[flat,-t],[r,lip-t]]),
    top:lathe([[r,lip-t],[r,lip],[flat,0],[0,0]]),
  };
}

// 支え: 軸の (0, y0) から、外へ開きながら皿の裏 (r, y1) まで伸びる枝を n 本
function armsGeo(y0,r,y1){
  const A=CAKESTAND.ARM, geos=[];
  for(let i=0;i<A.n;i++){
    const a=(i+0.5)/A.n*Math.PI*2;
    const from=new THREE.Vector3(0,y0,0), to=new THREE.Vector3(Math.cos(a)*r,y1,Math.sin(a)*r);
    const len=from.distanceTo(to);
    const g=new THREE.CylinderGeometry(A.r,A.r,len,4,1);
    g.translate(0,len/2,0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),to.clone().sub(from).normalize()));
    g.translate(0,y0,0);
    geos.push(g);
  }
  return mergeGeometries(geos);
}

export function createCakestand(){
  const C=CAKESTAND, S=C.SEG;
  const group=new THREE.Group();
  group.name='ケーキスタンド';
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const standMat=mat(C.COLOR.stand), plateMat=mat(C.COLOR.plate), underMat=mat(C.COLOR.under), cakeMat=mat(C.COLOR.cake);
  const lineMat=new THREE.LineBasicMaterial({color:C.COLOR.line});

  // パーツを置く。輪郭線（角が 30° 以上折れているところ。16 分割の丸の継ぎ目 22.5° には引かない）を本体の子に
  const add=(geo,m,name,y=0,outline=true)=>{
    const mesh=new THREE.Mesh(geo,m);
    mesh.name=name; mesh.position.y=y; mesh.castShadow=true; mesh.receiveShadow=true;
    if(outline){
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo,30),lineMat);
      line.userData.outline=true; mesh.add(line);
    }
    group.add(mesh);
    return mesh;
  };

  // 台座（上がわずかにすぼまった円盤）とラッパ形の脚
  add(new THREE.CylinderGeometry(C.FOOT.r*0.92,C.FOOT.r,C.FOOT.h,S).translate(0,C.FOOT.h/2,0),standMat,'台座');
  {
    const {r0,r1,h}=C.STEM, n=5, pts=[];
    for(let i=0;i<=n;i++){
      const t=i/n;
      pts.push(new THREE.Vector2(r1+(r0-r1)*Math.pow(1-t,2.6),t*h));   // 下ほど急に広がる
    }
    add(new THREE.LatheGeometry(pts,S/2),standMat,'脚',C.FOOT.h);
  }
  // 軸（脚の上から飾りの付け根まで1本）
  const top=C.TIERS[1], topCakeTop=top.y+top.cake.h;
  const rodBottom=C.FOOT.h+C.STEM.h-0.05, rodTop=topCakeTop+C.TOP.h;
  add(new THREE.CylinderGeometry(C.ROD.r,C.ROD.r,rodTop-rodBottom,4).translate(0,(rodTop-rodBottom)/2,0),standMat,'軸',rodBottom,false);

  // 皿・ケーキ・支え（下から）
  const names=['下','上'];
  C.TIERS.forEach((T,i)=>{
    // 皿の裏は皿の子にする（作業台では一覧に出ず、皿と一緒に動く）
    const {top,under}=plateGeo(T.plate,T.lip,C.PLATE_T);
    const plate=add(top,plateMat,`${names[i]}の皿`,T.y);
    const back=new THREE.Mesh(under,underMat);
    back.name=`${names[i]}の皿の裏`; back.castShadow=true; back.receiveShadow=true; back.userData.outline=true;
    plate.add(back);
    add(new THREE.CylinderGeometry(T.cake.r,T.cake.r,T.cake.h,S).translate(0,T.cake.h/2,0),cakeMat,`${names[i]}のケーキ`,T.y);
    add(armsGeo(0,T.arm.r,T.y-C.PLATE_T-T.arm.y),standMat,`${names[i]}の支え`,T.arm.y,false);
  });

  // てっぺんの飾り: 縦に立てた輪を軸のまわりに n 枚、少し外へ傾けて花のように
  {
    const L=C.TOP.loop, geos=[];
    for(let i=0;i<L.n;i++){
      const a=i/L.n*Math.PI*2;
      const g=new THREE.TorusGeometry(L.r,L.tube,4,10);
      g.scale(0.8,1.15,1);                       // 少し縦長の輪
      g.translate(L.out,L.r*1.15,0);             // 輪の下端が付け根
      g.rotateZ(-L.tilt);                        // 外へ傾ける
      g.rotateY(a);
      geos.push(g);
    }
    add(mergeGeometries(geos),standMat,'飾り',rodTop-0.05,false);
  }

  group.userData.footprint={halfW:C.FOOT.r,halfD:C.FOOT.r,radius:C.FOOT.r};  // 当たり判定用（台座だけの円。radius を見ない使い方では外接する矩形。皿は頭上なので下をくぐれる）
  group.userData.height=rodTop-0.05+C.TOP.loop.r*2.3;
  return group;
}

export const CAKESTAND_SIZE=CAKESTAND;   // 寸法
