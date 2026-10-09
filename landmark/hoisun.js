import * as THREE from 'three';
import { mergeStatic } from '../parts/mergeStatic.js';

// hoisun / hoason — workspace/hoisun.html と同じ形
// 顔のついた箱の家。台形の屋根、下に壁の並ぶ台と床板、左右の扉から外へすべり台が出ている
// 形は同じで色違いが2種類（HOISUN_COLORS.hoason = 暗い紫 / HOISUN_COLORS.hoisun = 白）
// 原点 = 床板の下面、左右の中央、正面から 1.8m 奥（地面）。+z が正面（顔の向き）、単位 1 = 1m
const HOISUN={
  SLAB:{d:4.0,h:0.35},                // 床板（中央で2枚に分かれている。幅と背面は上の段の壁にそろえる）
  BASE:{w:3.6,d:3.4,h:1.0,pw:0.7,gap:0.1,out:0.1,side:0.7,back:0.5},   // 下の台（奥の箱の幅・奥行き・高さ・中心寄りの壁の厚み・中心寄りの壁どうしの間隔・壁の出・外側の壁の厚み・背面を前へ詰める量。床板と上の箱の背面も一緒に詰める）
  BOX:{h:2.2,band:0.18,sink:0.5},   // 上の箱（下端に濃い帯・下の台へ沈める量。幅と奥行きは下の台の壁の外側にそろえる）
  ROOF:{h:0.4,inset:0.4},             // 箱の上の台形の屋根（高さ・上面を四方から内側へ寄せる量）
  WIN:{w:0.95,h:0.65,x:1.05,y:1.1,frame:0.09},     // 目の窓（幅・高さ・中心の左右位置・箱の下端からの高さ・枠の幅）
  SMILE:{r:0.2,tube:0.035,y:0.8,sy:1.5,syOut:1.2},      // 口（半径・太さ・箱の下端からの高さ・縦の倍率・輪の外側の頂点だけの縦の倍率）
  DOOR:{w:1.3,h:1.4,sill:0.15},  // 横の扉（幅・高さ・箱の下端から敷居まで。扉とすべり台は箱の奥行きの中央に置く）
  SLIDE:{w:1.3,t:0.12,wall:0.5,sy:1.2,seg:10,extra:2,chamfer:0.3,inset:0.2,trimW:0.2,trimT:0.05,merge:[3,6],top:1.2},   // すべり台（幅・板の厚み・縁の高さ・高さ方向の倍率・地面に着くまでの分割数・その先に伸ばす分割数・先端の縁の上の角を 45° で落とす量・切らずにさらに本体側へずらす量・縁の上面に貼る板の幅と厚み・先端から何枚目〜何枚目の面を 1 枚につなぐか・上端の地面からの高さ）
};
export const HOISUN_COLORS={
  hoason:{name:'hoason',box:0x6566a8,band:0x3d4466,win:0xf3d466,pillar:0xd8dce2,recess:0x6c7c86,slab:0xdde1e6,slide:0xb4bfc8,door:0x1e2130,frame:0x6b4a30},
  hoisun:{name:'hoisun',box:0xefebe3,band:0x55585e,win:0x8b8c90,pillar:0x93a3b4,recess:0x66788a,slab:0x9aa8b8,slide:0xafbbc6,door:0x55585e,frame:0x6b4a30},
};

// すべり台の側面の形（[外へ出る距離, 高さ]）。0 = 箱の側面
// 高さは上端（1.55）を扉の敷居に合わせ、sy 倍して置く。今の寸法では 0.58 が地面のすぐ上になる
const SLIDE_PATH=[[-0.4,1.55],[0.2,1.55],[0.45,1.45],[0.75,1.0],[0.92,0.7],[1.05,0.6],[1.25,0.58],[1.9,0.58]];

// U 字の断面を側面の形に沿って押し出す（side = +1 で +x 側、-1 で -x 側）。{slide: 本体, trims: 縁の上面の板 2 枚} を返す
function makeSlideGeo(x0,y0,zc,side){
  const S=HOISUN.SLIDE, hw=S.w/2, T=S.t, Wl=S.wall;
  // 上端（扉の敷居）を基準に高さ方向を sy 倍する。滑る面が地面に着くところから extra 分割ぶん先で切る
  const top=SLIDE_PATH[0][1];
  const curve=new THREE.SplineCurve(SLIDE_PATH.map(([u,y])=>new THREE.Vector2(u,top+(y-top)*S.sy)));
  let tGround=1;
  for(let k=1;k<=200;k++)if(y0+curve.getPoint(k/200).y<=0){tGround=k/200;break;}
  const step=tGround/S.seg;
  const tEnd=step*Math.min(S.seg+S.extra,Math.floor(1/step));
  // 1分割ぶん（横の長さの平均）本体側へ寄せてめり込ませ、箱の側面より内側の見えない部分は作らない
  // そのあと形は切らずに、全体を inset だけさらに本体側へずらす
  const cut=(curve.getPoint(tGround).x-curve.getPoint(0).x)/S.seg, shift=cut+S.inset;
  let tStart=0;
  for(let k=0;k<=400;k++)if(curve.getPoint(k/400).x>=cut){tStart=k/400;break;}
  const N=Math.max(1,Math.round((tEnd-tStart)/step));
  // 断面に沿う位置（p, t）。先端から chamfer 手前に 1 つ足す（縁の上の角を 45° で面取りするため）
  const C=S.chamfer;
  const frames=[];
  for(let i=0;i<N;i++){
    const u=tStart+(tEnd-tStart)*i/N;
    frames.push({p:curve.getPoint(u),t:curve.getTangent(u)});
  }
  const pE=curve.getPoint(tEnd), tE=curve.getTangent(tEnd);
  frames.push({p:pE.clone().addScaledVector(tE,-C),t:tE},{p:pE,t:tE});
  // 先端から数えて merge[0]〜merge[1] 枚目の面は、あいだの断面を抜いて 1 枚につなぐ
  const [m0,m1]=S.merge;
  frames.splice(frames.length-m1,m1-m0);
  const last=frames.length-1;

  // 断面を frames に沿って押し出す。secAt(i) は [a = 横方向, b = 滑る面からの法線方向, s = 進む向きへのずれ] の並び（外周を一周する順）
  const sweep=secAt=>{
    const rings=frames.map(({p,t},i)=>{
      const nu=-t.y, ny=t.x;   // 法線（上向き）
      return secAt(i).map(([a,b,sv=0])=>new THREE.Vector3(side*(x0+p.x-shift+nu*b+t.x*sv),y0+p.y+ny*b+t.y*sv,zc+a));
    });
    const pos=[];
    const tri=(a,b,c)=>{ if(side<0)[b,c]=[c,b]; pos.push(a.x,a.y,a.z,b.x,b.y,b.z,c.x,c.y,c.z); };
    const M=rings[0].length;
    for(let i=0;i<last;i++)for(let j=0;j<M;j++){
      const a=rings[i][j],b=rings[i][(j+1)%M],c=rings[i+1][(j+1)%M],d=rings[i+1][j];
      tri(a,c,b); tri(a,d,c);
    }
    // 両端のふた
    const cap=i=>THREE.ShapeUtils.triangulateShape(secAt(i).map(([a,b])=>new THREE.Vector2(a,b)),[]);
    cap(0).forEach(([i,j,k])=>tri(rings[0][i],rings[0][j],rings[0][k]));
    cap(last).forEach(([i,j,k])=>tri(rings[last][i],rings[last][k],rings[last][j]));
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.computeVertexNormals();
    return geo;
  };

  // すべり台本体（U 字）。先端の断面だけ縁を chamfer 低くする
  const sec=[[-hw,-T],[hw,-T],[hw,Wl],[hw-T,Wl],[hw-T,0],[-hw+T,0],[-hw+T,Wl],[-hw,Wl]];
  const secTip=sec.map(([a,b])=>[a,b===Wl?Wl-C:b]);
  const slide=sweep(i=>i===last?secTip:sec);

  // 縁の上面に貼る板（幅 trimW・厚み trimT）。面取りの斜面にも沿わせ、曲がり目は厚みがそろうように角をずらす
  const TW=S.trimW/2, TT=S.trimT, R2=Math.SQRT1_2;
  const trims=[-1,1].map(sa=>{
    const ac=sa*(hw-T/2), a0=ac-TW, a1=ac+TW;
    return sweep(i=>{
      if(i===last)return [[a0,Wl-C],[a1,Wl-C],[a1,Wl-C+TT*R2,TT*R2],[a0,Wl-C+TT*R2,TT*R2]];
      const sv=i===last-1?TT*(Math.SQRT2-1):0;
      return [[a0,Wl],[a1,Wl],[a1,Wl+TT,sv],[a0,Wl+TT,sv]];
    });
  });
  return {slide,trims};
}

// 色ごとのマテリアル（同じ色の建物どうしで使い回す）
// 発光は窓のガラスだけ（色の 4 割）。ほかは光らせない（作業台と同じ）
const hoisunLineMat=new THREE.LineBasicMaterial({color:0x2f3448});
const materialCache=new Map();
function materialsOf(colors){
  if(!materialCache.has(colors)){
    const mat=(color,glow=0)=>new THREE.MeshStandardMaterial({color,roughness:0.9,flatShading:true,
      emissive:new THREE.Color(color).multiplyScalar(glow)});
    materialCache.set(colors,{
      boxMat:mat(colors.box), bandMat:mat(colors.band), winMat:mat(colors.win,0.4),
      pillarMat:mat(colors.pillar), recessMat:mat(colors.recess), slabMat:mat(colors.slab),
      slideMat:mat(colors.slide), doorMat:mat(colors.door), frameMat:mat(colors.frame),
    });
  }
  return materialCache.get(colors);
}

function buildHoisun(colors){
  const H=HOISUN, SL=H.SLAB, BA=H.BASE, BX=H.BOX, WI=H.WIN, DO=H.DOOR;
  const group=new THREE.Group();
  group.name=colors.name;

  const {boxMat,bandMat,winMat,pillarMat,recessMat,slabMat,slideMat,doorMat,frameMat}=materialsOf(colors);

  // メッシュ + 輪郭線（edge は線にする角度のしきい値。false で線なし）
  const add=(geo,m,edge=20)=>{
    const mesh=new THREE.Mesh(geo,m);
    mesh.castShadow=true; mesh.receiveShadow=true;
    if(edge)mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,edge),hoisunLineMat));
    group.add(mesh);
    return mesh;
  };
  const box=(x0,x1,y0,y1,z0,z1,m,edge)=>{
    const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);
    g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
    return add(g,m,edge);
  };

  // 箱は下の台へ sink だけ沈めるので、下の台の上端（y1）は箱の下端で切る（面の重なりを作らない）
  const y0=SL.h, y1=SL.h+BA.h-BX.sink, bw=BA.w/2, bd=BA.d/2, zo=bd+BA.out;
  const xo=bw+BA.out, xi=xo-BA.side;
  const zk=-zo+BA.back;   // 背面（すべり台以外はここまで）

  // 床板（左右2枚）: 幅は上の段の壁の外側、背面は壁の背面にそろえ、正面だけ前に出す
  box(-xo,0,0,SL.h,zk,-zo+SL.d,slabMat);
  box(0,xo,0,SL.h,zk,-zo+SL.d,slabMat);

  // 下の台: 奥の濃い箱 + 奥行きいっぱいの壁 4 枚（外側 2 枚は厚み side、中心寄り 2 枚は厚み pw）
  // 正面と背面からは、壁のすき間に奥の箱が溝のように見える
  box(-bw,bw,y0,y1,zk+BA.out,bd,recessMat);
  [[xi,xo],[BA.gap/2,BA.gap/2+BA.pw]].forEach(([a,b])=>[-1,1].forEach(sx=>{
    box(sx>0?a:-b,sx>0?b:-a,y0,y1,zk,zo,pillarMat);
  }));

  // 上の箱（下端の帯 + 本体）
  const yb=y1, w=xo, d=zo;   // 箱の下端（窓・口・扉・すべり台もここが基準）
  box(-w,w,yb,yb+BX.band,zk,d,bandMat);
  box(-w,w,yb+BX.band,yb+BX.h,zk,d,boxMat);

  // 台形の屋根（箱と同じ色）: 箱の上面と同じ大きさの直方体の、上の面だけ四方から inset 内側へ寄せる
  const RF=H.ROOF, roofGeo=new THREE.BoxGeometry(2*w,RF.h,d-zk);
  const rp=roofGeo.attributes.position;
  for(let i=0;i<rp.count;i++){
    if(rp.getY(i)<0)continue;
    rp.setX(i,rp.getX(i)-Math.sign(rp.getX(i))*RF.inset);
    rp.setZ(i,rp.getZ(i)-Math.sign(rp.getZ(i))*RF.inset);
  }
  roofGeo.computeVertexNormals();
  roofGeo.translate(0,yb+BX.h+RF.h/2,(zk+d)/2);
  add(roofGeo,boxMat);

  // 目の窓（濃い枠 + ガラス）
  [-1,1].forEach(s=>{
    const cx=s*WI.x, cy=yb+WI.y, f=WI.frame;
    box(cx-WI.w/2-f,cx+WI.w/2+f,cy-WI.h/2-f,cy+WI.h/2+f,d,d+0.03,frameMat,false);
    box(cx-WI.w/2,cx+WI.w/2,cy-WI.h/2,cy+WI.h/2,d,d+0.05,winMat,false);
  });

  // 口（下向きの半円）
  // 縦に sy 倍するが、輪の外側（口の下の縁）の頂点だけは syOut 倍にして線が太くなりすぎないようにする
  const smileGeo=new THREE.TorusGeometry(H.SMILE.r,H.SMILE.tube,4,10,Math.PI);
  const sp=smileGeo.attributes.position;
  for(let i=0;i<sp.count;i++){
    const outer=Math.hypot(sp.getX(i),sp.getY(i))>H.SMILE.r+1e-4;
    sp.setY(i,sp.getY(i)*(outer?H.SMILE.syOut:H.SMILE.sy));
  }
  smileGeo.computeVertexNormals();
  const smile=add(smileGeo,doorMat,false);
  smile.rotation.z=Math.PI;
  smile.position.set(0,yb+H.SMILE.y,d+0.01);

  // 横の扉 + すべり台（左右）
  const slideBoxes=[];
  const sillY=yb+DO.sill, dz=(zk+d)/2;   // dz: 箱の奥行きの中央
  [-1,1].forEach(s=>{
    box(s>0?w:-w-0.03,s>0?w+0.03:-w,sillY,sillY+DO.h,dz-DO.w/2,dz+DO.w/2,doorMat,false);
    const sg=makeSlideGeo(w,H.SLIDE.top-HOISUN.SLIDE_Y0,dz,s);   // すべり台の高さは本体と切り離して地面から決める
    add(sg.slide,slideMat,false);   // すべり台は輪郭線なし
    sg.trims.forEach(g=>add(g,bandMat,false));   // 縁の上面の板（箱の下端の帯と同じ色）
    sg.slide.computeBoundingBox();
    slideBoxes.push(sg.slide.boundingBox);
  });

  // 当たり判定：建物（床板まで）と左右のすべり台の矩形。ゲーム側で当たり判定に加える
  const colliders=[];
  const collider=(x0,x1,z0,z1)=>{
    const o=new THREE.Object3D();
    o.position.set((x0+x1)/2,0,(z0+z1)/2);
    o.userData.footprint={halfW:(x1-x0)/2,halfD:(z1-z0)/2};
    group.add(o);
    colliders.push(o);
  };
  collider(-xo,xo,zk,-zo+SL.d);
  slideBoxes.forEach(bb=>collider(bb.min.x,bb.max.x,bb.min.z,bb.max.z));
  group.userData.colliders=colliders;   // userData.footprint を持つ Object3D の配列（原点が外形の中心ではないので矩形を分けて渡す）

  return group;
}
HOISUN.SLIDE_Y0=SLIDE_PATH[0][1];   // すべり台の上端を SLIDE.top に合わせるためのずらし

// hoisun（ほいすん・白）。colors に HOISUN_COLORS のどれかを渡すと色を変えられる
// 原点 = 地面、左右の中央、正面から 1.8m 奥・+z が正面（顔の向き）・高さ 3.45m（屋根の上面）
// userData.colliders = 当たり判定の矩形 3 つ（建物と左右のすべり台。userData.footprint を持つ Object3D）
// 動く部品はないので mergeStatic でマテリアルごとにまとめる（輪郭線もまとめる）
export function createHoisun(colors=HOISUN_COLORS.hoisun){
  return mergeStatic(buildHoisun(colors));
}

// hoason（ほあそん・暗い紫）。形は hoisun と同じ
export function createHoason(){
  return createHoisun(HOISUN_COLORS.hoason);
}

export const HOISUN_SIZE=HOISUN;   // 寸法
