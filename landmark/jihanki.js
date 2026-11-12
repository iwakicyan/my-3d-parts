import * as THREE from 'three';
import { createKan, KAN } from '../parts/kan.js';

// 自販機（jihanki）— workspace/jihanki.html と同じ形（手描きスケッチ documents/sketch/jihanki.PNG から）
// 水色の箱の正面に、白い枠の窓（奥に缶 = parts/kan.js）・センサー・金の帯・コイン投入口（コイン箱と同じ形）・
// 凹んだ取り出し口・ボタン（名前は作業台のまま「赤いボタン」。色は緑）。輪郭線なし。色は平たく見えるよう自発光を足す（色に対する割合 JIHANKI_GLOW）
// 原点 = 底面の真ん中・+z が正面、単位 1 = 1m（高さ 1.8m・幅 1.21m・奥行き 0.65m）
const S=1.8/520;   // 作業台のスケッチの 1 画素 (m)
const JIHANKI={
  W:350*S, H:520*S, D:0.65,          // 本体の幅・高さ・奥行き
  FR:0.04,                           // 窓の枠の厚み（正面から出る分）
  HOLE:{w:160*S, h:118*S, d:0.25},   // 取り出し口の幅・高さ・深さ
  COIN:{r:55*S, t:0.04, seg:16, bowlSeg:10, bowlRot:18, bowlRings:4},   // コイン投入口（半径・厚み・周りの分割、くぼみの分割・回転[度]・縁から中心への分割）
};
const JIHANKI_GLOW=0.45;

// 作業台で整えた配置：パーツごとの、自販機の原点から見た 4x4 行列（列優先）と色
const T=(x,y,z)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const JIHANKI_LAYOUT={
  '本体':               {m:T(-0.02887,0.9,0),          color:0x5fafd4},
  '窓の枠（上）':        {m:T(-0.02942,1.665,0.345),    color:0xf3f4f4},
  '窓の枠（左）':        {m:T(-0.48981,1.31192,0.345),  color:0xf3f4f4},
  '窓の枠（右）':        {m:T(0.42923,1.31192,0.345),   color:0xf3f4f4},
  '窓の枠（下）':        {m:T(-0.02942,0.91385,0.345),  color:0xf3f4f4},
  '窓の奥':             {m:T(-0.03115,1.31192,0.33),   color:0xd9dfe3},
  'センサー':            {m:T(-0.0226,0.91385,0.367),   color:0x46555a},
  '金の帯':             {m:T(-0.02942,0.77538,0.34),   color:0xd6a02c},
  'コイン投入口':        {m:T(0.25962,0.57115,0.325),   color:0xd6a02c},
  'コイン投入口（内側）': {m:T(0.25962,0.57115,0.325),   color:0xa8781a},
  'コインの切れこみ':     {m:T(0.25962,0.57115,0.325),   color:0x3b3226},
  '赤いボタン':             {m:[1,0,0,0, 0,1,0,0, 0,0,1.02452,0, 0.2573,0.28558,0.32024,1], color:0x02a26c},
  '取り出し口の詰め':     {m:T(-0.29887,0.44654,-0.125), color:0x5fafd4},
  '取り出し口の奥':       {m:T(-0.29887,0.44654,0.077),  color:0x4f8fae},
  '取り出し口の天井':     {m:[1,0,0,0, 0,0,1,0, 0,-1,0,0, -0.29887,0.64877,0.2,1], color:0x3d7590},
  '取り出し口の底':       {m:[1,0,0,0, 0,0,-1,0, 0,1,0,0, -0.29887,0.24431,0.2,1], color:0x8ccbe4},
  '取り出し口の左':       {m:[0,0,-1,0, 0,1,0,0, 1,0,0,0, -0.5738,0.44654,0.2,1],  color:0x45809c},
  '取り出し口の右':       {m:[0,0,1,0, 0,1,0,0, -1,0,0,0, -0.02395,0.44654,0.2,1], color:0x45809c},
};
const JIHANKI_KAN_AT=[-0.02769,1.11808,0.30524];   // 缶の原点（底面の真ん中）
const JIHANKI_TRAY_KAN=0.8;   // 取り出し口に出す缶の倍率（取り出し口の奥行き 0.25m に缶の直径 0.26m が入らないので縮める）

// 正面を向いた箱（幅・高さ・厚み）。原点 = 箱の真ん中
const boxGeo=(w,h,d)=>new THREE.BoxGeometry(w,h,d);

// 本体：正面の形に取り出し口の穴をあけて奥へ押し出す（穴は前から後ろまで抜ける。奥は「取り出し口の詰め」でふさぐ）。原点 = 本体の真ん中
function bodyGeo(){
  const {W,H,D,HOLE:h}=JIHANKI;
  const hx=(452-530)*S, hy=(645-516)*S-H/2;   // 穴の真ん中（スケッチの x 372〜532・y 457〜575）
  const sh=new THREE.Shape([[-W/2,-H/2],[W/2,-H/2],[W/2,H/2],[-W/2,H/2]].map(([x,y])=>new THREE.Vector2(x,y)));
  sh.holes.push(new THREE.Path([[-1,-1],[1,-1],[1,1],[-1,1]].reverse().map(([x,y])=>new THREE.Vector2(hx+x*h.w/2,hy+y*h.h/2))));
  const g=new THREE.ExtrudeGeometry(sh,{depth:D,bevelEnabled:false});
  g.translate(0,0,-D/2);
  return g;
}

// コイン投入口（コイン箱 landmark/coinbox.js と同じ形を、円盤の半径の比で縮めたもの）。原点 = 円盤の裏の真ん中・+z が正面
function coinGeos(){
  const c=JIHANKI.COIN, k=c.r/0.2;
  const bowlR=0.08*k, bowlD=0.03*k, bowlRot=THREE.MathUtils.degToRad(c.bowlRot);
  const sl={w:0.033*k, l:0.225*k};
  const sphR=(bowlR*bowlR+bowlD*bowlD)/(2*bowlD);   // くぼみの球の半径
  const bowlZ=r=>r>=bowlR?c.t:c.t-bowlD+sphR-Math.sqrt(sphR*sphR-r*r);   // 中心から r の所の表面の高さ
  const ngon=(r,n,rot=0)=>Array.from({length:n},(_,i)=>{const f=i/n*Math.PI*2+rot;return new THREE.Vector2(r*Math.sin(f),-r*Math.cos(f));});
  // 金の丸：外は seg 角形、真ん中にくぼみの多角形の穴をあけて厚み t に押し出す
  const disc=new THREE.Shape(ngon(c.r,c.seg));
  disc.holes.push(new THREE.Path(ngon(bowlR,c.bowlSeg,bowlRot).reverse()));
  const discGeo=new THREE.ExtrudeGeometry(disc,{depth:c.t,bevelEnabled:false});
  // くぼみ：縁から中心へ下りていく球面
  const prof=[];
  for(let i=c.bowlRings;i>=0;i--){const r=bowlR*i/c.bowlRings;prof.push(new THREE.Vector2(r,bowlZ(r)));}
  const bowlGeo=new THREE.LatheGeometry(prof,c.bowlSeg); bowlGeo.rotateX(Math.PI/2); bowlGeo.rotateZ(bowlRot);
  // 切れこみ：くぼみの面に沿わせて折った板。多角形の縁までの距離で r を割り戻してから高さを求める
  const seg=Math.PI*2/c.bowlSeg;
  const edgeAt=(x,y)=>{const f=Math.atan2(x,-y)-bowlRot; const rel=((f%seg)+seg)%seg-seg/2; return Math.cos(seg/2)/Math.cos(rel);};
  const surfZ=(x,y)=>bowlZ(Math.hypot(x,y)/edgeAt(x,y));
  const ys=[-sl.l/2,0,sl.l/2];
  for(let i=1;i<=c.bowlRings;i++){
    const r=bowlR*i/c.bowlRings;
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
  slotGeo.setIndex(si); slotGeo.computeVertexNormals();
  return {discGeo,bowlGeo,slotGeo};
}

export function createJihanki(){
  const {D,FR,HOLE:h}=JIHANKI;
  const px=n=>n*S;
  const coin=coinGeos();
  const sensor=new THREE.CylinderGeometry(px(34),px(34),0.012,10); sensor.rotateX(Math.PI/2); sensor.scale(1,0.4,1);
  // パーツの形（原点は作業台と同じ）
  const geos={
    '本体':bodyGeo(),
    '窓の枠（上）':boxGeo(px(293),px(32),FR),
    '窓の枠（左）':boxGeo(px(27),px(172),FR),
    '窓の枠（右）':boxGeo(px(28),px(172),FR),
    '窓の枠（下）':boxGeo(px(293),px(58),FR),
    '窓の奥':boxGeo(px(238),px(172),0.01),
    'センサー':sensor,
    '金の帯':boxGeo(px(293),px(22),0.03),
    'コイン投入口':coin.discGeo,
    'コイン投入口（内側）':coin.bowlGeo,
    'コインの切れこみ':coin.slotGeo,
    '赤いボタン':boxGeo(px(60),px(19),0.025),
    '取り出し口の詰め':boxGeo(h.w,h.h,D-h.d),
    '取り出し口の奥':boxGeo(h.w,h.h,0.004),
    '取り出し口の天井':new THREE.PlaneGeometry(h.w,h.d),
    '取り出し口の底':new THREE.PlaneGeometry(h.w,h.d),
    '取り出し口の左':new THREE.PlaneGeometry(h.d,h.h),
    '取り出し口の右':new THREE.PlaneGeometry(h.d,h.h),
  };
  const noShadow=new Set(['取り出し口の天井','取り出し口の底','取り出し口の左','取り出し口の右']);   // くぼみの内側の板は影を落とさない
  const mats=new Map();   // 同じ色のパーツはマテリアルを共有する
  const matOf=c=>{
    if(!mats.has(c)){const m=new THREE.MeshLambertMaterial({color:c});m.emissive.set(c).multiplyScalar(JIHANKI_GLOW);mats.set(c,m);}
    return mats.get(c);
  };

  const group=new THREE.Group();
  group.name='自販機';
  for(const [name,{m,color}] of Object.entries(JIHANKI_LAYOUT)){
    const mesh=new THREE.Mesh(geos[name],matOf(color));
    mesh.name=name;
    mesh.matrix.fromArray(m);
    mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
    mesh.castShadow=!noShadow.has(name); mesh.receiveShadow=true;
    group.add(mesh);
  }
  const kan=createKan();
  kan.position.fromArray(JIHANKI_KAN_AT);
  group.add(kan);
  group.userData.kan=kan;

  // コイン投入口：ローカル +z が面の法線・+y が切れこみの向き・原点が円盤の表の真ん中（コイン箱の userData.slot と同じ）
  const at=name=>new THREE.Vector3().fromArray(JIHANKI_LAYOUT[name].m,12);
  const slot=new THREE.Object3D(); slot.name='コイン投入口の面';
  slot.position.copy(at('コイン投入口')).add(new THREE.Vector3(0,0,JIHANKI.COIN.t));
  group.add(slot);
  group.userData.slot=slot;
  group.userData.slotMeshes=['コイン投入口','コイン投入口（内側）','コインの切れこみ'].map(n=>group.getObjectByName(n));   // コインを入れる当たり
  // 取り出し口の底の真ん中（缶を出す所）
  const tray=new THREE.Object3D(); tray.name='取り出し口の置き場';
  tray.position.copy(at('取り出し口の底'));
  group.add(tray);
  group.userData.tray=tray;
  // 本体の底の真ん中（接地ラインを光らせる所）と本体の幅・奥行き
  const base=new THREE.Object3D(); base.name='本体の底';
  base.position.set(at('本体').x,0,at('本体').z);
  group.add(base);
  group.userData.base=base;
  group.userData.baseSize={w:JIHANKI.W,d:JIHANKI.D};
  // 取り出し口に出した缶の当たり（寝かせた缶より少し大きい見えない箱。タップの当たりと、光らせる所に使う）
  const ks=JIHANKI_TRAY_KAN, kanL=KAN.H*ks, kanD=2*KAN.R*ks;
  const trayHit=new THREE.Mesh(new THREE.BoxGeometry(kanL+0.04,kanD+0.02,kanD+0.04),new THREE.MeshBasicMaterial({visible:false}));
  trayHit.name='取り出し口の缶の当たり';
  trayHit.position.y=kanD/2;
  tray.add(trayHit);
  group.userData.trayHit=trayHit;
  group.userData.trayKanSize={length:kanL,diameter:kanD};
  // 取り出し口に缶を 1 本出す（横に寝かせ、ラベルを正面へ。取り出し口に収まるよう JIHANKI_TRAY_KAN 倍）。出した缶を返す
  let trayKan=null;   // 出ている缶（寝かせるためのグループ）
  group.userData.dispenseKan=()=>{
    group.userData.takeKan();   // 前の缶があれば片付ける
    const k=createKan(); k.scale.setScalar(ks); k.position.y=-kanL/2;   // 缶の真ん中を原点へ
    const holder=new THREE.Group(); holder.name='出てきた缶';
    holder.rotation.z=Math.PI/2;      // 缶の軸（y）を横（x）へ寝かせる。ラベル（+z）は正面のまま
    holder.position.y=kanD/2+0.002;   // 底に載せる
    holder.add(k);
    tray.add(holder);
    trayKan=holder;
    return k;
  };
  group.userData.hasKan=()=>!!trayKan;
  // 出ている缶を取り出口から外して返す（JIHANKI_TRAY_KAN 倍のまま。なければ null）
  group.userData.takeKan=()=>{
    if(!trayKan)return null;
    const k=trayKan.children[0];
    tray.remove(trayKan); trayKan.remove(k); trayKan=null;
    k.position.set(0,0,0);
    return k;
  };
  group.userData.footprint={halfW:JIHANKI.W/2+0.03,halfD:JIHANKI.D/2+0.05};   // 当たり判定用（ローカル XZ の矩形。本体のずれと正面の出っぱりの分を足す）
  return group;
}
