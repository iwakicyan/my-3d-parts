import * as THREE from 'three';

// ツリーハウス — workspace/treehouse.html と同じ形。原点 = 幹の根元の中心（地面）、単位 1 = 1m
// 木は chairtree / forest1 と同じローポリ流儀
// 家は真ん中で折れていて、左右の部屋がそれぞれ勝手な角度を向いている
export function createTreehouse(){
  const DEG=Math.PI/180;
  const mkRng=seed=>()=>{seed^=seed<<13;seed^=seed>>17;seed^=seed<<5;return (seed>>>0)/0xffffffff;};
  const rng=mkRng(7);

  const mat=color=>new THREE.MeshPhongMaterial({color,flatShading:true});
  const woodMat=mat(0x7a5c4e), wallMat=mat(0xefebe2), roofMat=mat(0xa9554a);
  const windowMat=mat(0x6f7072), doorMat=mat(0x6a5e58), ladderMat=mat(0x2b2e45);
  const leafMats=[mat(0x6a9070),mat(0x5f8665),mat(0x76a07a)];
  const leafMatsYG=[mat(0x86a464),mat(0x7b9a5a),mat(0x92b06c)];   // 黄緑寄り
  const tintRng=mkRng(11);   // 色決め専用（葉の配置用の rng の並びを変えないよう別にする）

  const group=new THREE.Group();
  group.name='ツリーハウス';
  function mesh(geo,m,parent=group){
    const o=new THREE.Mesh(geo,m);
    o.castShadow=true;
    parent.add(o);
    return o;
  }

  // --- 幹と根 ---------------------------------------------------
  const TRUNK_H=5.6;
  const trunk=mesh(new THREE.CylinderGeometry(0.7,1.0,TRUNK_H,6),woodMat);
  trunk.position.y=TRUNK_H/2;
  trunk.rotation.z=-4*DEG;
  // 根: 地面を這う三角錐。左に長く伸びる1本 + 短い根
  [
    {ry:  180, len:5.0, r:0.55},
    {ry:  -40, len:2.4, r:0.45},
    {ry:   60, len:2.0, r:0.45},
    {ry:  130, len:1.8, r:0.40},
  ].forEach(({ry,len,r})=>{
    const ROOT_SCALE=1.5;                     // 根の大きさ（長さ・太さ）の倍率
    len*=ROOT_SCALE; r*=ROOT_SCALE;
    const pivot=new THREE.Group();
    pivot.rotation.y=ry*DEG;
    group.add(pivot);
    // 幹側の端を軸に、外側の先端が ROOT_SINK だけ地面に埋まるよう傾ける
    const ROOT_SINK=0.6;
    const tilt=new THREE.Group();
    tilt.position.set(0.4,0.15,0);
    tilt.rotation.z=-Math.atan2(ROOT_SINK,len);
    pivot.add(tilt);
    const root=mesh(new THREE.ConeGeometry(r,len,3),woodMat,tilt);
    root.rotation.z=-90*DEG;                 // 先端を +X（外側）へ
    root.scale.set(1,1,0.6);
    root.position.set(len/2,0,0);
  });
  // 枝と葉はまとめて canopy に入れ、配置を保ったまま上下に動かせるようにする
  const canopy=new THREE.Group();
  canopy.position.y=-1.5;
  group.add(canopy);

  // 主枝: 幹の上から斜め上へ
  [
    {x:-0.2,y:3.1,rz: 40,ry:  10,len:3.6},
    {x: 0.2,y:2.7,rz:-45,ry: -20,len:3.4},
    {x: 0.0,y:3.7,rz: 10,ry:  90,len:3.0},
  ].forEach(({x,y,rz,ry,len})=>{
    const pivot=new THREE.Group();
    pivot.position.set(x,y,0);
    pivot.rotation.set(0,ry*DEG,rz*DEG);
    canopy.add(pivot);
    const b=mesh(new THREE.CylinderGeometry(0.22,0.45,len,5),woodMat,pivot);
    b.position.y=len/2;
  });

  // --- 家（左右 2 部屋） ------------------------------------------
  // 部屋 = 壁の箱 + 台形の屋根。原点 = 床の中心、+Z 面が正面
  function room(w,h,d){
    const g=new THREE.Group();
    const box=mesh(new THREE.BoxGeometry(w,h,d),wallMat,g);
    box.position.y=h/2;
    const OH=0.35, RH=0.6;                   // 屋根の張り出し・高さ
    const ROOF_TOP=0.72;                     // 天面の大きさ（底面に対する比。大きいほど傾斜が急）
    const roofGeo=new THREE.CylinderGeometry(Math.SQRT1_2*ROOF_TOP,Math.SQRT1_2,RH,4,1);
    roofGeo.rotateY(Math.PI/4);              // 角を対角に → 辺が X/Z 軸にそろう正方形の錐台
    const roof=mesh(roofGeo,roofMat,g);
    roof.scale.set(w+2*OH,1,d+2*OH);
    roof.position.y=h+RH/2;
    group.add(g);
    return g;
  }
  const RW=3.0, RHt=2.3, RD=2.6;

  // 左の部屋: 正面に窓、右側面に扉
  const left=room(RW,RHt,RD);
  left.position.set(-1.9,3.2,1.0);
  left.rotation.set(4*DEG,-30*DEG,-7*DEG);
  const win=mesh(new THREE.BoxGeometry(1.7,1.1,0.06),windowMat,left);
  win.position.set(-0.15,1.25,RD/2+0.03);
  const mullion=mesh(new THREE.BoxGeometry(0.08,1.1,0.08),wallMat,left);   // 窓の中央の桟
  mullion.position.set(-0.15,1.25,RD/2+0.05);
  const DOOR_W=0.75, DOOR_H=1.6;
  const door=mesh(new THREE.BoxGeometry(0.06,DOOR_H,DOOR_W),doorMat,left);
  door.position.set(RW/2+0.03,DOOR_H/2,RD/2-DOOR_W/2-0.25);
  const knob=mesh(new THREE.IcosahedronGeometry(0.06,0),wallMat,left);
  knob.position.set(RW/2+0.08,DOOR_H*0.5,RD/2-DOOR_W-0.12);

  // 右の部屋: 幹の右奥で別の向き
  const right=room(RW*0.95,RHt,RD);
  right.position.set(2.3,3.7,-2.0);
  right.rotation.set(-5*DEG,35*DEG,-20*DEG);   // 外側（ローカル +X、幹から離れる側）の面を 20° 地面側へ傾ける

  group.updateMatrixWorld(true);

  // --- 葉: 正二十面体・正八面体の塊 ----------------------------------
  // 樹冠の楕円体の中にランダムに置く。部屋の中と、左の部屋の正面・扉側（窓・扉・はしご）は空けておく
  const leafCenter=new THREE.Vector3(0,7.2,-0.4), leafR=new THREE.Vector3(4.4,2.0,3.2);
  const keepOut=[
    [left,  new THREE.Vector3(0,1.2,0),          2.0],   // 左の部屋
    [right, new THREE.Vector3(0,1.2,0),          2.0],   // 右の部屋
    [left,  new THREE.Vector3(-0.2,1.2,RD/2+1.4),2.0],   // 窓の前
    [left,  new THREE.Vector3(RW/2+1.4,0.8,0.6), 2.0],   // 扉の前
  ].map(([room,v,r])=>[room.localToWorld(v.clone()),r]);
  keepOut.forEach(k=>group.worldToLocal(k[0]));
  let placed=0;
  while(placed<30){
    const p=new THREE.Vector3(rng()*2-1,rng()*2-1,rng()*2-1);
    if(p.lengthSq()>1)continue;
    p.multiply(leafR).add(leafCenter);
    const s=0.9+rng()*0.8;
    if(keepOut.some(([c,r])=>p.distanceTo(c)<r+s*0.6))continue;
    addLeaf(p,s);
    placed++;
  }
  // 右の部屋の下・枝先の小さな塊（元の 4 個を、2 個ずつ寄せて密集させる）
  // LOW_PULL: 水平方向に木の中心（幹の軸）へ寄せる割合（1 = 元の位置）
  const LOW_PULL=0.6;
  [[4.45,3.6,-0.45,0.9],[4.55,4.1,-0.95,0.8],[1.08,3.5,-1.15,0.8],[1.22,3.3,-0.65,0.7]].forEach(([x,y,z,s])=>{ addLeaf(new THREE.Vector3(x*LOW_PULL,y,z*LOW_PULL),s).userData.low=true; });
  // 中心（幹の軸）から xz ±1 の範囲にある葉を持ち上げる
  // 樹冠の葉は +3（ただし一番高い 1 個は +2 にとどめて頂上に載せる）、下の塊（幹横）は +1
  const CORE_HALF=1;
  const core=canopy.children.filter(o=>o.isMesh&&Math.abs(o.position.x)<=CORE_HALF&&Math.abs(o.position.z)<=CORE_HALF);
  const crown=core.filter(o=>!o.userData.low);
  const top=crown.reduce((a,o)=>o.position.y>a.position.y?o:a,crown[0]);
  core.forEach(o=>{ o.position.y+=o.userData.low?1:o===top?2:3; });
  function addLeaf(p,s){
    const geo=rng()>0.35?new THREE.IcosahedronGeometry(s,0):new THREE.OctahedronGeometry(s*1.1,0);
    const mi=Math.floor(rng()*leafMats.length);
    const leaf=mesh(geo,(tintRng()<0.55?leafMatsYG:leafMats)[mi],canopy);   // 半数ちょっとを黄緑寄りに
    leaf.position.copy(p);
    leaf.rotation.set(rng()*Math.PI*2,rng()*Math.PI*2,rng()*Math.PI*2);
    return leaf;
  }

  // 左の部屋を、窓のある面（ローカル +Z）が地面側を向くように 20° 傾ける。
  // 葉の配置（部屋を避ける判定）が変わらないよう、葉を置いたあとに傾け、はしごは傾けた扉に合わせる
  left.rotateX(20*DEG);
  // 右の部屋も葉を置いたあとで、水平方向に幹へ 0.4 寄せる
  const toTrunk=new THREE.Vector3(-right.position.x,0,-right.position.z).normalize();
  right.position.addScaledVector(toTrunk,0.4);
  // 2 部屋とも 0.5 下げる（葉・枝は canopy ごと下げてある）
  left.position.y-=0.5;
  right.position.y-=0.5;
  group.updateMatrixWorld(true);

  // --- はしご: 扉の前から地面まで -----------------------------------
  const doorFoot=new THREE.Vector3(RW/2+0.1,0,RD/2-DOOR_W/2-0.25);    // 扉の下端（扉の厚み + 支柱の半分だけ外 → はしごの上端が壁に接する）
  left.localToWorld(doorFoot); group.worldToLocal(doorFoot);
  const ladder=new THREE.Group();
  const LH=doorFoot.y, LW=0.7;
  [-LW/2,LW/2].forEach(x=>{
    const RAIL_EXTRA=0.2;                  // 支柱を上端からはみ出させる長さ（大きいと壁にめり込む）
    const rail=mesh(new THREE.BoxGeometry(0.08,LH+RAIL_EXTRA,0.08),ladderMat,ladder);
    rail.position.set(x,(LH+RAIL_EXTRA)/2,0);
  });
  for(let y=0.45;y<LH;y+=0.45){
    const rung=mesh(new THREE.BoxGeometry(LW,0.06,0.06),ladderMat,ladder);
    rung.position.y=y;
  }
  // 横板は扉の面と平行・地面と水平。はしご自身の X 軸まわりに LEAN だけ壁側へ立てかけ、
  // 上端がちょうど扉の前に来るよう、根元を壁から外側へずらす
  const LEAN=9*DEG, LADDER_RY=(-30-90)*DEG;
  ladder.rotation.order='YXZ';
  ladder.rotation.set(LEAN,LADDER_RY,0);
  const outward=new THREE.Vector3(-Math.sin(LADDER_RY),0,-Math.cos(LADDER_RY));   // はしごのローカル -Z（壁から離れる向き）
  ladder.position.set(doorFoot.x,0,doorFoot.z).addScaledVector(outward,LH*Math.tan(LEAN));
  group.add(ladder);

  group.userData.footprint={halfW:1.2,halfD:1.2};  // 当たり判定用（幹のまわりだけ。部屋は頭上なので下をくぐれる）
  return group;
}
