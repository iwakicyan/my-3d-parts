// ============================================================
//  bluedog — 水色のまるい犬（形は workspace/bluedog.html と同じ）
//  createBluedog({colors, layout, height}): 原点 = 足元の中心（地面）・+z が正面
//    layout: パーツごとの変形（BLUEDOG_LAYOUT。作業台で動かした配置を確定したもの）。null なら BLUEDOG の数値どおりの形
//            変形はジオメトリに焼き込むので、パーツのメッシュは原点・向きなし・倍率 1 になる
//    height: 全体の高さ [m]（足先から頭のてっぺんまで）。null ならモデル単位のまま（高さ BLUEDOG_HEIGHT）
//    merge: true なら動く部分（脚 4 本・しっぽ・それ以外の体）ごとに、パーツを色つきの 1 メッシュ＋輪郭線 1 メッシュへまとめる
//           （描画 1 匹 12 回。色は頂点の色で持つ。動く部分は userData.walkUnit の Group で、腰などの軸は userData.pivot）
//  createBluedogWalk(root): 歩くモーション。update(t, amp) で t 秒の姿勢、stop() で元の形
//  輪郭線は法線方向に押し出した裏面（userData.outline のメッシュ。本体の子）
//  userData.walk に歩くときの役割（脚・爪・棒・しっぽ・胴）
// ============================================================
import * as THREE from 'three'
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const BLUEDOG={
  HEAD:{r:1.05,pos:[0,2.0,0.55],seg:[8,6]},   // seg = 分割数（横・縦。SEG の倍率は掛けない）
  BODY:{r:0.88,pos:[0,1.95,-0.75],sz:1.1,seg:[6,5]},
  EYE:{az:24,el:18,w:0.26,h:0.33,seg:6,lift:0.015},   // 大きい目（方位角・仰角・幅・高さ・板の角の数・頭の表面から浮かせる量。点も同じ角の数と浮かせ方）
  DOT:{az:62,el:6,w:0.12,h:0.15},         // 横の小さい目
  TEETH:{el:-14,az:[7.2,36],h:0.22,t:0.03,top:0.03},  // 牙：爪と同じ王冠の形の板を左右に 1 枚ずつ（仰角・先の並ぶ方位角の範囲・長さ・厚み・頭の表面から上へ埋める量）
  MITT:{w:0.34,h:0.5,d:0.24,x:0.3,y:1.3,z:1.62,tilt:0.2,seg:[6,4]},  // 口をおさえる手（脚も同じ形・同じ分割数）
  ROD:0.05,                               // 灰色の棒の半径
  TAIL:{from:[0,2.35,-1.6],to:[0,3.15,-2.2],r:0.24,seg:[5,3]},
  // 爪：3 本の三角を 1 枚にまとめた王冠の形の板。点は下の辺の真ん中を原点、上（y）が先の向き。w は先から先までの幅
  CLAW:{w:0.3,t:0.03,tilt:0.5,y:0.1,z:0.45,
    pts:[[-0.31,0],[-0.5,0.71],[-0.125,0.34],[0,0.83],[0.12,0.34],[0.5,0.71],[0.31,0]]},
  OUTLINE:0.035,
  GLOW:0.1,                               // 自発光（色に対する割合）
  SEG:0.3,                                // 分割数の倍率（元の分割数に掛ける）
};
export const BLUEDOG_COLORS={skin:0x8eeafa,shade:0x5fbfd6,hole:0x18216a,rod:0x8b9196,tooth:0xffffff,line:0x2a3474};


// 作業台（workspace/bluedog.html）で確定した配置。パーツ（名前#番号）ごとの、モデルの座標での 4x4 行列（列優先）
// パーツの番号は同じ名前のパーツを作った順（爪・脚の棒は 右前 / 右後ろ / 左前 / 左後ろ、牙・手の棒は 右 / 左）
export const BLUEDOG_LAYOUT={
  '胴':[1.11242,0,0,0,0,0.70249,0,0,0,0,1.03794,0,0,1.41974,-0.61893,1],
  'しっぽの玉':[1,0,0,0,0,1,0,0,0,0,1,0,0,2.07148,-1.93982,1],
  'しっぽの棒':[1,0,0,0,0,0.9483,-0.31737,0,0,0.31737,0.9483,0,0,1.77926,-1.54267,1],
  '右目':[0.85929,-0.33831,-0.0226,0,0.3331,0.83881,0.10841,0,-0.0211,-0.1199,0.99256,0,-0.47678,2.34711,1.41413,1],
  '頭':[1,0,0,0,0,1,0,0,0,0,1,0,0,2,0.55,1],
  '右の点':[0.91869,-0.34808,0.18665,0,0.35121,1.12467,0.36869,0,-0.27399,-0.22126,0.93594,0,-0.86978,2.2598,1.0444,1],
  '左目':[0.85929,0.33831,0.0226,0,-0.3331,0.83881,0.10841,0,0.0211,-0.1199,0.99256,0,0.47678,2.34711,1.41413,1],
  '左の点':[0.91869,0.34808,-0.18665,0,-0.35121,1.12467,0.36869,0,0.27399,-0.22126,0.93594,0,0.86978,2.2598,1.0444,1],
  '牙#1':[-0.55811,0.36619,-0.74459,0,-0.80256,-1.45345,-0.11324,0,-0.67523,0.32111,0.66404,0,-0.24369,1.81496,1.5853,1],
  '牙#2':[-0.55811,-0.36619,0.74459,0,0.80256,-1.45345,-0.11324,0,0.67523,0.32111,0.66404,0,0.24369,1.81496,1.5853,1],
  '右手':[0.57985,-0.81248,-0.06035,0,0.75701,0.47318,0.90326,0,-0.55539,-0.44839,0.70035,0,-0.57258,1.41884,1.34695,1],
  '手の棒#1':[0.95326,-0.00578,0.30209,0,0.0011,0.99988,0.01568,0,-0.41952,-0.02029,1.32343,0,-0.86789,1.24738,0.62931,1],
  '左手':[0.57985,0.81248,0.06035,0,-0.75701,0.47318,0.90326,0,0.55539,-0.44839,0.70035,0,0.5412,1.41884,1.35403,1],
  '手の棒#2':[0.95326,0.00578,-0.30209,0,-0.0011,0.99988,0.01568,0,0.41952,-0.02029,1.32343,0,0.86789,1.24738,0.62931,1],
  '脚の棒#1':[0.85029,-0.37799,0,0,0.40621,0.91378,0,0,0,0,1,0,-0.91444,1.08828,0.12789,1],
  '爪#1':[1.537,0.21043,0.28622,0,-0.05994,0.93023,-0.36204,0,-0.21707,0.34186,0.91434,0,-1.38957,0.15179,0.61419,1],
  '右前脚':[0.98313,0.07317,0.16763,0,0.03162,0.83472,-0.54977,0,-0.18015,0.5458,0.81832,0,-1.16527,0.58451,0.36832,1],
  '脚の棒#3':[0.85029,0.37799,0,0,-0.40621,0.91378,0,0,0,0,1,0,0.91444,1.08828,0.12789,1],
  '爪#3':[1.537,-0.21043,-0.28622,0,0.05994,0.93023,-0.36204,0,0.21707,0.34186,0.91434,0,1.38957,0.15179,0.61419,1],
  '左前脚':[0.98313,-0.07317,-0.16763,0,-0.03162,0.83472,-0.54977,0,0.18015,0.5458,0.81832,0,1.17097,0.58451,0.36868,1],
  '左後ろ脚':[-0.29093,0.20541,-0.93443,0,-0.53305,0.77624,0.3366,0,0.79449,0.59603,-0.11634,0,1.18637,0.50239,-0.99378,1],
  '爪#4':[1.01861,0,-0.8549,0,0,1.10104,0,0,1.08994,0,1.29866,0,1.46494,0.0971,-0.94803,1],
  '脚の棒#4':[0.63735,0.61016,-0.47062,0,-1.15923,1.8711,0.85597,0,0.59401,0,0.80446,0,0.97749,0.90539,-0.8375,1],
  '右後ろ脚':[-0.29093,-0.20541,0.93443,0,0.53305,0.77624,0.3366,0,-0.79449,0.59603,-0.11634,0,-1.2184,0.50239,-0.99378,1],
  '爪#2':[1.01861,0,0.8549,0,0,1.10104,0,0,-1.08994,0,1.29866,0,-1.46494,0.0971,-0.94803,1],
  '脚の棒#2':[0.63735,-0.61016,0.47062,0,1.15923,1.8711,0.85597,0,-0.59401,0,0.80446,0,-0.97749,0.90539,-0.8375,1],
}
export const BLUEDOG_LAYOUT_CENTERS={
  '頭':[0, 2, 0.55],
  '胴':[0, 1.95, -0.75],
  '右目':[-0.3999, 2.31396, 1.44036],
  '右の点':[-0.92914, 2.1102, 1.04403],
  '左目':[0.3999, 2.31396, 1.44036],
  '左の点':[0.92914, 2.1102, 1.04403],
  '牙#1':[-0.36673, 1.66598, 1.46888],
  '牙#2':[0.36673, 1.66598, 1.46888],
  '右手':[-0.31569, 1.3, 1.61646],
  '手の棒#1':[-0.32238, 1.0398, 1.20854],
  '左手':[0.28431, 1.3, 1.62354],
  '手の棒#2':[0.32238, 1.0398, 1.20854],
  '右前脚':[-0.88609, 0.46969, 0.75861],
  '爪#1':[-1.12847, 0.0362, 0.90418],
  '脚の棒#1':[-0.64903, 1.17167, 0.6397],
  '右後ろ脚':[-0.43601, 0.5, -0.85],
  '爪#2':[-0.42, 0.04031, -0.63274],
  '脚の棒#2':[-0.4, 1.125, -0.8375],
  '左前脚':[0.8918, 0.46969, 0.75897],
  '爪#3':[1.12847, 0.0362, 0.90418],
  '脚の棒#3':[0.64903, 1.17167, 0.6397],
  '左後ろ脚':[0.40399, 0.5, -0.85],
  '爪#4':[0.42, 0.04031, -0.63274],
  '脚の棒#4':[0.4, 1.125, -0.8375],
  'しっぽの棒':[0, 2.7575, -1.89],
  'しっぽの玉':[-0.02292, 3.15, -2.2],
}
// ↑ BLUEDOG_LAYOUT を作ったときの各パーツの形の中心（分割数を変えると中心が少し動くので、焼き込むときにその分を補正する）
export const BLUEDOG_HEIGHT=3.13   // BLUEDOG_LAYOUT の形の、足先から頭のてっぺんまで（モデル単位）

export function createBluedog({colors=BLUEDOG_COLORS,layout=BLUEDOG_LAYOUT,height=null,merge=false}={}){
  const C=colors;
  const B=BLUEDOG;
  const g=new THREE.Group(); g.name='bluedog';

  const lambert=c=>{const m=new THREE.MeshLambertMaterial({color:c,emissive:new THREE.Color(c).multiplyScalar(B.GLOW)});m.userData.emissiveK=B.GLOW;return m;};
  const M={
    skin:lambert(C.skin), rod:lambert(C.rod), tooth:lambert(C.tooth),
    hole:new THREE.MeshBasicMaterial({color:C.hole}),
  };
  // 輪郭線：法線方向に一定の厚みだけ押し出した裏面（形の変形はジオメトリに焼き込むので厚みはどこも同じ）
  const lineMat=new THREE.MeshBasicMaterial({color:C.line,side:THREE.BackSide});
  lineMat.onBeforeCompile=s=>{
    s.vertexShader=s.vertexShader.replace('#include <begin_vertex>',`vec3 transformed = position + normal * ${B.OUTLINE.toFixed(4)};`);
  };

  // パーツの原点は形の中心（回転の軸がその場所になるように）。position が元の位置
  const add=(geo,mat,name,outline=true)=>{
    geo.computeBoundingBox();
    const c=geo.boundingBox.getCenter(new THREE.Vector3()); geo.translate(-c.x,-c.y,-c.z);
    const m=new THREE.Mesh(geo,mat); m.name=name; m.castShadow=true; m.position.copy(c); g.add(m);
    if(outline){const o=new THREE.Mesh(geo,lineMat); o.name=name+'(線)'; o.userData.outline=true; m.add(o);}
    return m;
  };
  const V=a=>new THREE.Vector3(...a);
  const seg=(n,min=3)=>Math.max(min,Math.round(n*B.SEG));   // 分割数（倍率を掛けて丸め、最低 min）
  const deg=THREE.MathUtils.degToRad;

  // 球の表面の点（方位角 az：+z から +x へ、仰角 el）
  const head=V(B.HEAD.pos);
  const onHead=(az,el,r=B.HEAD.r)=>{
    const a=deg(az),e=deg(el);
    const n=new THREE.Vector3(Math.sin(a)*Math.cos(e),Math.sin(e),Math.cos(a)*Math.cos(e));
    return {p:head.clone().addScaledVector(n,r),n};
  };

  // 継ぎ目（経度 0 と 360°）と極で重なっている頂点をまとめる。位置と法線が同じなので見た目は変わらない（uv は使わないので捨てる）
  const weld=geo=>{geo.deleteAttribute('uv');return mergeVertices(geo);};
  const sphere=(r,w,h)=>weld(new THREE.SphereGeometry(r,w,h));

  // 棒（a から b へ）。両端は手・脚・胴に埋まって見えないので、ふたなしの筒
  const rod=(a,b,name)=>{
    a=V(a); b=V(b);
    const len=a.distanceTo(b);
    const geo=weld(new THREE.CylinderGeometry(B.ROD,B.ROD,len,seg(8),1,true));
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
    geo.translate(...a.clone().add(b).multiplyScalar(0.5).toArray());
    return add(geo,M.rod,name);
  };

  // --- 頭と胴 ---
  const headGeo=sphere(B.HEAD.r,...B.HEAD.seg); headGeo.translate(...B.HEAD.pos);
  add(headGeo,M.skin,'頭');
  const bodyGeo=sphere(B.BODY.r,...B.BODY.seg); bodyGeo.scale(1,1,B.BODY.sz); bodyGeo.translate(...B.BODY.pos);
  add(bodyGeo,M.skin,'胴').userData.walk={body:true};

  // --- 目（楕円の板を頭の表面に沿わせて貼る） ---
  // 板の点を、目の中心で頭に接する面に置いてから、頭の中心から見た向きのまま球の表面（少し外）へ押し出す
  const hole=(az,el,w,h,name)=>{
    const {n}=onHead(az,el);
    const tx=new THREE.Vector3(0,1,0).cross(n).normalize(), ty=n.clone().cross(tx);
    const geo=new THREE.CircleGeometry(1,B.EYE.seg); geo.deleteAttribute('uv'); geo.deleteAttribute('normal');
    const pos=geo.attributes.position, q=new THREE.Vector3();
    for(let i=0;i<pos.count;i++){
      q.copy(n).multiplyScalar(B.HEAD.r).addScaledVector(tx,pos.getX(i)*w).addScaledVector(ty,pos.getY(i)*h)
        .normalize().multiplyScalar(B.HEAD.r+B.EYE.lift).add(head);
      pos.setXYZ(i,q.x,q.y,q.z);
    }
    const m=add(geo,M.hole,name,false);
    // 目を板にする前（平たい楕円の球）の原点。元の原点（c）が入っていない古い保存を読むときの補正に使う
    m.userData.legacyCenter=onHead(az,el,B.HEAD.r-0.02).p.toArray();
  };
  for(const s of [-1,1]){
    hole(s*B.EYE.az,B.EYE.el,B.EYE.w,B.EYE.h,s<0?'右目':'左目');
    hole(s*B.DOT.az,B.DOT.el,B.DOT.w,B.DOT.h,s<0?'右の点':'左の点');
  }

  // --- 牙（口のあたりに、王冠の形の板を先を下にして左右に 1 枚ずつ。頭のまるみに沿って曲げる） ---
  // 板の横（x）を頭の表面に沿った長さとして、頭の縦の軸のまわりに巻きつける。3 つの先は方位角 az[0]〜az[1] に並ぶ
  const T=B.TEETH;
  const fangGeo=s=>{
    const R=B.HEAD.r*Math.cos(deg(T.el));                      // その高さでの頭の水平の半径
    const y0=head.y+B.HEAD.r*Math.sin(deg(T.el))+T.top;         // 板の上の辺の高さ
    const a0=deg(T.az[0]), a1=deg(T.az[1]);
    const w=R*(a1-a0), hs=T.h/0.83;                             // 0.83 = 形の点の真ん中の先の高さ
    const pts=B.CLAW.pts.map(([px,py])=>new THREE.Vector2(-s*px*w,-py*hs));   // 先を下へ。左右で鏡写し
    let geo=new THREE.ExtrudeGeometry(new THREE.Shape(pts),{depth:T.t,bevelEnabled:false});
    geo.translate(0,0,-T.t/2);
    geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
    geo=mergeVertices(geo);
    const pos=geo.attributes.position, ac=s*(a0+a1)/2;
    for(let i=0;i<pos.count;i++){
      const a=ac+pos.getX(i)/R, rr=R+pos.getZ(i);
      pos.setXYZ(i,head.x+rr*Math.sin(a),y0+pos.getY(i),head.z+rr*Math.cos(a));
    }
    geo.computeVertexNormals();
    return geo;
  };
  for(const s of [-1,1])add(fangGeo(s),M.tooth,'牙');

  // --- 口をおさえる手（平たい楕円）と、胸からの棒 ---
  const MI=B.MITT;
  for(const s of [-1,1]){
    const geo=sphere(1,...MI.seg); geo.scale(MI.w,MI.h,MI.d);
    geo.rotateZ(-s*MI.tilt); geo.rotateX(-0.25);
    geo.translate(s*MI.x,MI.y,MI.z);
    add(geo,M.skin,s<0?'右手':'左手');
    rod([s*0.35,1.15,0.9],[s*MI.x,MI.y-MI.h*0.7,MI.z-0.1],'手の棒');
  }

  // --- 脚（手と同じ平たい楕円を立て、下端を地面に）と爪 ---
  const CL=B.CLAW;
  const clawGeo=()=>{
    const sh=new THREE.Shape(CL.pts.map(([px,py])=>new THREE.Vector2(px*CL.w,py*CL.w)));
    let geo=new THREE.ExtrudeGeometry(sh,{depth:CL.t,bevelEnabled:false});
    geo.translate(0,0,-CL.t/2);
    // 輪郭線を法線方向に押し出すので、角で切れないよう頂点をまとめてなめらかな法線にする
    geo.deleteAttribute('normal'); geo.deleteAttribute('uv');
    geo=mergeVertices(geo); geo.computeVertexNormals();
    geo.rotateX(Math.PI/2+CL.tilt);           // 先（+y）を前へ、少し下向きに
    geo.translate(0,CL.y,MI.d*CL.z);
    return geo;
  };
  // userData.walk に歩くときの役割を付ける（leg = 'FR' 右前 / 'FL' 左前 / 'BR' 右後ろ / 'BL' 左後ろ、part = 'leg' / 'claw' / 'rod'）
  const leg=(x,z,yaw,splay,name,tag)=>{
    const geo=sphere(1,...MI.seg); geo.scale(MI.w,MI.h,MI.d); geo.translate(0,MI.h,0);
    geo.rotateZ(splay); geo.rotateY(yaw); geo.translate(x,0,z);
    add(geo,M.skin,name).userData.walk={leg:tag,part:'leg'};
    // 爪：王冠の形の板 1 枚を、つま先から前へ（少し下向きに）出す。付け根は脚に埋める
    add(clawGeo().rotateZ(splay).rotateY(yaw).translate(x,0,z),M.tooth,'爪').userData.walk={leg:tag,part:'claw'};
    const top=new THREE.Vector3(0,MI.h*2-0.05,0).applyAxisAngle(new THREE.Vector3(0,0,1),splay).applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(new THREE.Vector3(x,0,z));
    return top;
  };
  for(const s of [-1,1]){
    // 前脚：頭の横へ開く
    const F=s<0?'FR':'FL', Bk=s<0?'BR':'BL';
    const tf=leg(s*1.05,0.7,s*0.35,s*0.35,s<0?'右前脚':'左前脚',F);
    rod(tf.toArray(),[s*0.55,1.45,0.45],'脚の棒').userData.walk={leg:F,part:'rod'};
    // 後ろ脚：胴の下
    const tb=leg(s*0.42,-0.85,0,0,s<0?'右後ろ脚':'左後ろ脚',Bk);
    rod(tb.toArray(),[s*0.38,1.3,-0.85],'脚の棒').userData.walk={leg:Bk,part:'rod'};
  }

  // --- しっぽ：棒の先に玉 ---
  rod(B.TAIL.from,B.TAIL.to,'しっぽの棒').userData.walk={tail:'rod'};
  const ballGeo=sphere(B.TAIL.r,...B.TAIL.seg); ballGeo.translate(...B.TAIL.to);
  add(ballGeo,M.skin,'しっぽの玉').userData.walk={tail:'ball'};


  // 確定した配置を焼き込む（同じ名前のパーツは作った順に #1, #2 …）
  if(layout){
    const seen={};
    g.children.forEach(m=>{
      if(!m.isMesh)return;
      seen[m.name]=(seen[m.name]||0)+1;
      const same=g.children.filter(c=>c.isMesh&&c.name===m.name).length;
      const key=same>1?m.name+'#'+seen[m.name]:m.name;
      const e=layout[key]; if(!e)return;
      // 形の中心が原点のジオメトリを、確定した位置・向き・倍率へ。配置を作ったときから中心が動いていればその分を足してから
      const mat=new THREE.Matrix4().fromArray(e), c0=layout===BLUEDOG_LAYOUT&&BLUEDOG_LAYOUT_CENTERS[key];
      if(c0)mat.multiply(new THREE.Matrix4().makeTranslation(m.position.x-c0[0],m.position.y-c0[1],m.position.z-c0[2]));
      m.geometry.applyMatrix4(mat);
      m.position.set(0,0,0);
    });
  }
  if(merge)mergeWalkUnits(g,M,lineMat,B.GLOW);
  if(height)g.scale.setScalar(height/BLUEDOG_HEIGHT);
  return g;
}

// 動く部分（'FR' 'FL' 'BR' 'BL' / 'tail' / 'body'）ごとに、パーツを 1 メッシュ（頂点の色）＋輪郭線 1 メッシュへまとめる
// 色の違うパーツを 1 つにするため、マテリアルは白の Lambert に頂点の色を掛ける。自発光も頂点の色 × glow にする
function mergeWalkUnits(g,M,lineMat,glow){
  const pv=bluedogPivots(g);
  const roleOf=m=>{const w=m.userData.walk||{};return w.leg||(w.tail?'tail':'body');};
  const mat=new THREE.MeshLambertMaterial({vertexColors:true,emissive:new THREE.Color(glow,glow,glow)});
  mat.onBeforeCompile=sh=>{
    sh.fragmentShader=sh.fragmentShader.replace('vec3 totalEmissiveRadiance = emissive;','vec3 totalEmissiveRadiance = emissive * vColor;');
  };
  const roles={};
  [...g.children].filter(c=>c.isMesh).forEach(m=>(roles[roleOf(m)]=roles[roleOf(m)]||[]).push(m));
  for(const [role,ms] of Object.entries(roles)){
    const geos=[], lines=[];
    for(const m of ms){
      m.updateMatrix();
      let geo=m.geometry.clone();
      for(const k of Object.keys(geo.attributes))if(k!=='position'&&k!=='normal')geo.deleteAttribute(k);
      if(!geo.attributes.normal)geo.computeVertexNormals();
      if(!geo.index)geo=mergeVertices(geo);
      geo.applyMatrix4(m.matrix);
      const hasLine=m.children.some(c=>c.userData.outline);
      if(hasLine)lines.push(geo.clone());
      const c=m.material.color, n=geo.attributes.position.count, col=new Float32Array(n*3);
      for(let i=0;i<n;i++){col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;}
      geo.setAttribute('color',new THREE.BufferAttribute(col,3));
      geos.push(geo);
      g.remove(m);
    }
    const unit=new THREE.Group();
    unit.name=role; unit.userData.walkUnit=role;
    if(pv[role])unit.userData.pivot=pv[role].toArray();
    const body=new THREE.Mesh(mergeGeometries(geos),mat); body.name=role; body.castShadow=true;
    unit.add(body);
    if(lines.length){const o=new THREE.Mesh(mergeGeometries(lines),lineMat); o.name=role+'(線)'; o.userData.outline=true; unit.add(o);}
    g.add(unit);
  }
}

// ===== 歩くモーション =====
// createBluedogWalk(root) で、いまの姿勢を基本の形として覚え、update(t, amp) で歩く姿勢にする。stop() で基本の形に戻す
// 脚：対角の 2 本ずつ（右前と左後ろ / 左前と右後ろ）を交互に、腰（脚の棒の胴側の端）を軸に前後へ振る。前へ振る間は足を少し上げる
// 体：胴・頭・手など脚としっぽ以外を、一歩ごとに少し上下させる
// しっぽ：付け根（しっぽの棒の胴側の端）を軸に左右へ振る
// amp：動きの大きさ（0〜1。立ち止まるときに 0 へ寄せると、なめらかに基本の形へ戻る）
// 動かすもの：root の直下に動く部分ごとのまとまり（userData.walkUnit。createBluedog({merge:true})）があればそれを、なければパーツ 1 つずつ
//   パーツ 1 つずつのときは userData.walk の役割で見分け、腰・しっぽの付け根は棒の頂点から求める（bluedogPivots）
// 計算は root の座標（モデル単位）で行うので、root ごと動かしたり回したりしてよい。パーツがグループに入っていても動く
export const BLUEDOG_WALK={speed:1, swing:0.45, lift:0.1, bob:0.035, wag:0.4};   // 1 秒あたりの歩数の倍率（1 で 1.6 歩）・脚の振り幅[rad]・足を上げる高さ・体の上下・しっぽの振り幅[rad]（長さはモデル単位）

// 腰（脚ごと）としっぽの付け根を、root の座標で求める。脚の棒のうち脚からいちばん遠い頂点 / しっぽの棒のうち胴にいちばん近い頂点
export function bluedogPivots(root){
  root.updateMatrixWorld(true);
  const rootInv=root.matrixWorld.clone().invert();
  const rel=x=>rootInv.clone().multiply(x.matrixWorld);
  const parts=[]; root.traverse(c=>{if(c.isMesh&&!c.userData.outline&&c.userData.walk)parts.push(c);});
  const center=m=>{m.geometry.computeBoundingBox();return m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(rel(m));};
  const rodEnd=(rod,ref,far)=>{
    const pos=rod.geometry.attributes.position, v=new THREE.Vector3(), r=rel(rod); let best=null, bd=far?-1:1e9;
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i).applyMatrix4(r);
      const d=v.distanceTo(ref);
      if(far?d>bd:d<bd){bd=d;best=v.clone();}
    }
    return best;
  };
  const out={};
  for(const tag of ['FR','FL','BR','BL']){
    const legM=parts.find(m=>m.userData.walk.leg===tag&&m.userData.walk.part==='leg');
    const rod=parts.find(m=>m.userData.walk.leg===tag&&m.userData.walk.part==='rod');
    if(legM&&rod)out[tag]=rodEnd(rod,center(legM),true);
  }
  const tailRod=parts.find(m=>m.userData.walk.tail==='rod'), bodyM=parts.find(m=>m.userData.walk.body);
  if(tailRod&&bodyM)out.tail=rodEnd(tailRod,center(bodyM),false);
  return out;
}

export function createBluedogWalk(root,opt={}){
  const o={...BLUEDOG_WALK,...opt};
  root.updateMatrixWorld(true);
  const rootInv=root.matrixWorld.clone().invert();
  const rel=x=>rootInv.clone().multiply(x.matrixWorld);                        // root の座標での変形
  // 動かすもの：{obj, role('FR'…'BL' / 'tail' / 'body'), pivot}
  let movers;
  const units=root.children.filter(c=>c.userData.walkUnit);
  if(units.length){
    movers=units.map(u=>({obj:u,role:u.userData.walkUnit,pivot:u.userData.pivot&&new THREE.Vector3().fromArray(u.userData.pivot)}));
  }else{
    const pv=bluedogPivots(root);
    movers=[];
    root.traverse(c=>{
      if(!c.isMesh||c.userData.outline)return;
      const w=c.userData.walk||{};
      const role=w.leg||(w.tail?'tail':'body');
      movers.push({obj:c,role,pivot:pv[role]});
    });
  }
  movers.forEach(m=>{m.base={p:m.obj.position.clone(),q:m.obj.quaternion.clone(),s:m.obj.scale.clone(),r:rel(m.obj),pinv:rel(m.obj.parent).invert()};});

  const AX=new THREE.Vector3(1,0,0), UP=new THREE.Vector3(0,1,0);
  const M=new THREE.Matrix4(), R=new THREE.Matrix4(), T=new THREE.Matrix4(), B=new THREE.Matrix4();
  // root の座標での変形 m4 を、親の座標での変形にして入れる
  const put=(m,m4)=>M.multiplyMatrices(m.base.pinv,m4).decompose(m.obj.position,m.obj.quaternion,m.obj.scale);
  // root の座標で：pivot を通る axis まわりに angle 回し、dy だけ上へ
  const turn=(m,axis,angle,dy)=>{
    const p=m.pivot;
    R.makeRotationAxis(axis,angle);
    T.makeTranslation(p.x,p.y+dy,p.z).multiply(R).multiply(B.makeTranslation(-p.x,-p.y,-p.z));
    return T.multiply(m.base.r);
  };
  const PHASE={FR:0,BL:0,FL:Math.PI,BR:Math.PI};
  return {
    update(t,amp=1){
      const ph=t*Math.PI*2*0.8*o.speed;                // 1 周で 2 歩
      const bob=amp*o.bob*(0.5-0.5*Math.cos(ph*2));
      for(const m of movers){
        if(m.role in PHASE&&m.pivot){
          const a=ph+PHASE[m.role];
          // 前（+z）へ振るとき負の角度。前へ振っている間だけ足を上げる
          put(m,turn(m,AX,-amp*o.swing*Math.sin(a),amp*o.lift*Math.max(0,Math.cos(a))));
        }else if(m.role==='tail'&&m.pivot){
          put(m,turn(m,UP,amp*o.wag*Math.sin(ph*2),bob));
        }else{
          put(m,T.makeTranslation(0,bob,0).multiply(m.base.r));
        }
      }
    },
    stop(){movers.forEach(m=>{m.obj.position.copy(m.base.p);m.obj.quaternion.copy(m.base.q);m.obj.scale.copy(m.base.s);});},
  };
}
