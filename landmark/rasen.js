import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 螺旋階段（rasen）— documents/sketch/柱.PNG の右の 1 本。原点 = 底面の中心、単位 1 = 1m
// 真ん中の芯柱のまわりを扇形の踏み板が回って上がり、外側に帯（側桁）が螺旋に付く。まわりを 3 本の柱が囲み、てっぺんは踊り場
export const RASEN={
  H:80,            // 踊り場の上面の高さ
  TURNS:11,        // 回る数（1 周 約 7.3m 上がる。TURNS*STEPS が段の数なので整数になるように）
  STEPS:24,        // 1 周の段数（全 264 段、1 段 約 0.30m）
  R:8,             // 踏み板の外の半径（踏み板の幅 = R - CORE_R = 7.32m）
  CORE_R:0.68,     // 芯柱（六角柱）の半径（角まで）
  TREAD_T:0.15,    // 踏み板の厚さ
  BAND:{w:0.16,h:0.45},          // 側桁の厚さ（半径の向き）と高さ
  POST:{r:0.24,dist:8.08,h:81},  // 柱（四角柱）の太さの半分・芯からの距離・高さ（120° おきに 3 本。側桁に重なる）
  CORE_TOP:1.8,    // 芯柱が踊り場より上に出る長さ
  LANDING:Math.PI/2,             // 踊り場の扇の角度
  SEG:1,           // 踏み板 1 枚の弧の分割数（1 = 芯を頂点にした三角形）
  LANDING_SEG:6,   // 踊り場の弧の分割数
  BAND_SEG:1,      // 側桁の 1 段ぶんの分割数（継ぎ目は段の境目にそろう）
  COLOR:{tread:0x4a4a4a,band:0x3c3c3c,core:0x5a3434,post:0x6b3b3b,line:0x161616},
};

export function createRasen(){
  const C=RASEN;
  const group=new THREE.Group();
  group.name='螺旋階段';
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const treadMat=mat(C.COLOR.tread), bandMat=mat(C.COLOR.band), coreMat=mat(C.COLOR.core), postMat=mat(C.COLOR.post);
  const lineMat=new THREE.LineBasicMaterial({color:C.COLOR.line});

  // パーツを置く。輪郭線（30° 以上折れている角）を本体の子に
  const add=(geo,m,name,x=0,z=0,outline=true,edge=30)=>{
    const mesh=new THREE.Mesh(geo,m);
    mesh.name=name; mesh.position.set(x,0,z); mesh.castShadow=true; mesh.receiveShadow=true;
    if(outline){
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo,edge),lineMat);
      line.userData.outline=true; mesh.add(line);
    }
    group.add(mesh);
    return mesh;
  };

  const N=C.TURNS*C.STEPS;     // 段の数（いちばん上は踊り場）
  const rise=C.H/N;            // 1 段の高さ
  const dA=Math.PI*2/C.STEPS;  // 1 段の角度
  // 角度 a は上から見て反時計回り（x=r cos a, z=-r sin a）。上がるほど a が増える

  // 扇形の板：角度 a0..a1、上面の高さ y、厚さ t。要は芯（0,0）。外の弧を seg 分割（1 なら三角形）。芯の側は芯柱に隠れる
  const sector=(a0,a1,y,t,seg)=>{
    const s=new THREE.Shape();
    s.moveTo(0,0);
    for(let k=0;k<=seg;k++){const a=a0+(a1-a0)*k/seg; s.lineTo(C.R*Math.cos(a),C.R*Math.sin(a));}
    const geo=new THREE.ExtrudeGeometry(s,{depth:t,bevelEnabled:false,curveSegments:1});
    geo.rotateX(-Math.PI/2);   // Shape の (x,y) → (x,-z)、押し出しは上へ
    geo.translate(0,y-t,0);
    return geo;
  };

  // 踏み板（全部で 1 つのパーツ）
  const treads=[];
  for(let i=0;i<N-1;i++)treads.push(sector(i*dA,(i+1)*dA,(i+1)*rise,C.TREAD_T,C.SEG));
  add(mergeGeometries(treads),treadMat,'踏み板');

  // 踊り場（いちばん上）
  const a0=(N-1)*dA;
  add(sector(a0,a0+C.LANDING,C.H,C.TREAD_T*1.5,C.LANDING_SEG),treadMat,'踊り場');

  // 側桁：踏み板の外側を回る帯。上の縁は各段の前の縁の下面を通る
  {
    const {w,h}=C.BAND, r0=C.R, r1=C.R+w;
    const total=a0+C.LANDING, n=Math.round(total/dA)*C.BAND_SEG;
    // 分割が粗いので、弦の真ん中が半径 R に来るよう頂点を外へ出す（帯が踏み板に食い込まない）
    const kR=1/Math.cos(total/n/2), r0k=r0*kR, r1k=r1*kR;
    const pos=[], idx=[];
    for(let k=0;k<=n;k++){
      const a=total*k/n, c=Math.cos(a), s=-Math.sin(a);
      const top=Math.min(a/dA*rise+rise-C.TREAD_T, C.H-C.TREAD_T*1.5), bot=top-h;
      // 断面の 4 隅：内上・外上・外下・内下
      pos.push(r0k*c,top,r0k*s, r1k*c,top,r1k*s, r1k*c,bot,r1k*s, r0k*c,bot,r0k*s);
    }
    for(let k=0;k<n;k++){
      const p=k*4,q=p+4;
      for(let e=0;e<4;e++){const e1=(e+1)%4; idx.push(p+e,q+e1,q+e, p+e,p+e1,q+e1);}
    }
    // 両端のふた
    idx.push(0,1,2, 0,2,3);
    const L=n*4; idx.push(L,L+2,L+1, L,L+3,L+2);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setIndex(idx);
    // 面の表は外向き。頂点を面ごとに分けて、面ごとの平らな陰影にする（角の頂点を共有すると法線が上下・内外で混ざる）
    const flat=geo.toNonIndexed(); flat.computeVertexNormals();
    add(flat,bandMat,'側桁',0,0,true,31);   // 段の境目の折れ目（1 段 15°）には線を引かない
  }

  // 芯柱
  add(new THREE.CylinderGeometry(C.CORE_R,C.CORE_R,C.H+C.CORE_TOP,6).translate(0,(C.H+C.CORE_TOP)/2,0),coreMat,'芯柱',0,0,false);

  // まわりの柱 3 本（面を芯に向ける）
  const {r,dist,h}=C.POST;
  for(let k=0;k<3;k++){
    const a=a0+C.LANDING+k*Math.PI*2/3;   // 1 本目は踊り場の終わりの端に立てる
    add(new THREE.BoxGeometry(r*2,h,r*2).translate(0,h/2,0),postMat,`柱${k+1}`,dist*Math.cos(a),-dist*Math.sin(a),false).rotation.y=a;
  }

  // ゲームで使う情報
  //   colliders: 当たり判定（userData.footprint を持つ Object3D。芯柱は円、柱は四角）
  //   上を歩く高さは rasenFloor で測る（螺旋は上下に重なるので、上から地面を測るレイでは測れない）
  const colliders=[];
  const collider=(x,z,ry,fp)=>{
    const o=new THREE.Object3D();
    o.position.set(x,0,z); o.rotation.y=ry; o.userData.footprint=fp;
    group.add(o); colliders.push(o);
  };
  collider(0,0,0,{radius:C.CORE_R});
  for(let k=0;k<3;k++){
    const a=a0+C.LANDING+k*Math.PI*2/3;
    collider(dist*Math.cos(a),-dist*Math.sin(a),a,{halfW:r,halfD:r});
  }
  group.userData.colliders=colliders;
  group.userData.height=C.H+C.CORE_TOP;

  return group;
}

// 螺旋階段の上を歩く床の高さ（ローカル座標。単位 1 = 1m）
//   (x, z) の真上・真下にある踏み板と踊り場の上面のうち、y + up 以下でいちばん高いもの。無ければ null
//   y は今の足の高さ。up は一度に上がれる段差（1 段の高さより少し大きく、1 周の高さよりずっと小さく）
//   踏み板の外の縁は直線（三角形）だが、半径 R の円で見る
export function rasenFloor(x,z,y,up=0.45){
  const C=RASEN;
  const r=Math.hypot(x,z);
  if(r>C.R)return null;
  const N=Math.round(C.TURNS*C.STEPS), rise=C.H/N, dA=Math.PI*2/C.STEPS;
  let a=Math.atan2(-z,x); if(a<0)a+=Math.PI*2;   // 角度は上から見て反時計回り（x=r cos a, z=-r sin a）
  const lim=y+up;
  let best=null;
  // 踊り場（いちばん上。角度 a0..a0+LANDING）
  const a0=(N-1)*dA;
  let da=(a-a0)%(Math.PI*2); if(da<0)da+=Math.PI*2;
  if(da<=C.LANDING&&C.H<=lim)best=C.H;
  // 踏み板 i（角度 i*dA..(i+1)*dA、上面 (i+1)*rise）。同じ向きの踏み板は STEPS 段おき
  const i0=Math.floor(a/dA)%C.STEPS;
  const k=Math.floor((lim/rise-1-i0)/C.STEPS);   // (i0+k*STEPS+1)*rise <= lim になるいちばん大きい k
  if(k>=0){
    const i=Math.min(i0+k*C.STEPS,N-2-((N-2-i0)%C.STEPS+C.STEPS)%C.STEPS);
    if(i>=0&&i<=N-2){const top=(i+1)*rise; if(best===null||top>best)best=top;}
  }
  return best;
}
