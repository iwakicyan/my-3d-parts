import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 五重塔（gojunoto）— workspace/gojunoto.html と同じ形
// とてもシンプルな五重塔。四角い基壇（上面は浅い屋根の形）の上に、こげ茶の胴と反りのある屋根を 4 段重ねる
// いちばん上は先のとがった四角錐の屋根。屋根は軒先の四隅が反り上がる
// 原点 = 底面の中心、+z が正面（どの面も同じ形）、単位 1 = 1m
const GOJUNOTO={
  BASE:{half:3.0,h:3.2},                         // 基壇（半分の幅・高さ）
  BASE_CAP:{outer:3.0,rise:0.8,lift:0,p:1.2},  // 基壇の上面（外の縁から胴へ上がる）
  BODY:{half:[1.5,1.45,1.4,1.35],h:1.6},       // 胴（下から。半分の幅・高さ）
  ROOF:{outer:[3.0,2.9,2.8],rise:0.45,thick:0.2,lift:0.3,p:1.2},  // 中の屋根 3 段（下から）
  TOP:{outer:3.0,rise:2.4,thick:0.2,lift:0.4,p:1.6},                // いちばん上の四角錐の屋根
  SEG:{side:6,radial:4},                        // 屋根の分割数（辺に沿って・内から外へ）
  COLOR:{wood:0xe0c89a,body:0x9a8774,under:0x000000,line:0x2a2d33},   // under は屋根の裏（地面を向いた面）
  // 作業台（workspace/gojunoto.html）で整えたパーツの位置（y）と倍率。上の寸法で積んだあとに、この値で置き直す
  // 基壇は少し地面に沈めて細くし、屋根は少し厚く、いちばん上の屋根は低くしてある
  LAYOUT:{
    '基壇':      {y:-1.7009,s:[0.8543,1.235,0.8946]},
    '基壇の屋根':{y: 2.2512,s:[0.8543,1.235,0.8946]},
    '胴':        {y: 2.6141,s:[1,1.0948,1]},
    '屋根2':     {y: 4.5891,s:[1,1.0956,1]},
    '屋根3':     {y: 6.342, s:[1,1.0956,1]},
    '屋根4':     {y: 8.095, s:[1,1.0956,1]},
    '屋根5':     {y:10.057, s:[1,0.8296,1]},
  },
};

// 屋根の面の高さ: 内の縁 (t=0) が rise、外の縁 (t=1) が 0 へ下がり（p > 1 で反った凹み）、四隅ほど lift だけ反り上がる
const roofY=(t,s,{rise,lift,p})=>rise*Math.pow(1-t,p)+lift*t*t*Math.pow(Math.abs(s),3);

// 四角い輪の屋根（inner = 内の縁の半分の幅。0 なら四角錐）。上面・下面（thick だけ下）・軒先の縁を 4 辺ぶん作る
// { top: 上面と軒先の縁, under: 下面（裏は胴と同じ色にするので分ける） } を返す。原点 = 外の縁の高さで中心
function roofGeo({inner,outer,rise,thick,lift,p}){
  const {side:S,radial:T}=GOJUNOTO.SEG;
  const top={pos:[],idx:[]}, under={pos:[],idx:[]};
  const opt={rise,lift,p};
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2, ca=Math.cos(a), sa=Math.sin(a);
    // この辺の点（s: 辺に沿って -1〜1、t: 内から外へ 0〜1、dy: 下面へ下げる量）
    const pt=(s,t,dy)=>{
      const r=inner+(outer-inner)*t;
      const x=s*r, z=r;
      return [x*ca+z*sa, roofY(t,s,opt)-dy, -x*sa+z*ca];
    };
    const grid=(dy,flip,{pos,idx})=>{
      const base=pos.length/3;
      for(let j=0;j<=T;j++)for(let i=0;i<=S;i++)pos.push(...pt(-1+2*i/S,j/T,dy));
      for(let j=0;j<T;j++)for(let i=0;i<S;i++){
        const v=base+j*(S+1)+i, w=v+S+1;
        if(flip)idx.push(v,v+1,w, v+1,w+1,w); else idx.push(v,w,v+1, v+1,w,w+1);
      }
    };
    grid(0,false,top);        // 上面
    grid(thick,true,under);   // 下面
    // 軒先の縁（外の縁の上面と下面をつなぐ）
    const base=top.pos.length/3;
    for(let i=0;i<=S;i++){const s=-1+2*i/S; top.pos.push(...pt(s,1,0),...pt(s,1,thick));}
    for(let i=0;i<S;i++){const v=base+2*i; top.idx.push(v,v+1,v+2, v+2,v+1,v+3);}
  }
  const toGeo=({pos,idx})=>{
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  return {top:toGeo(top),under:toGeo(under)};
}

export function createGojunoto(){
  const G=GOJUNOTO;
  const group=new THREE.Group();
  group.name='五重塔';
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const woodMat=mat(G.COLOR.wood), bodyMat=mat(G.COLOR.body), underMat=mat(G.COLOR.under);
  const lineMat=new THREE.LineBasicMaterial({color:G.COLOR.line});

  // パーツを置く。原点はパーツの中心の下（回転・拡大縮小の中心）。角と屋根の稜線に輪郭線（本体の子。outline=false で付けない）
  const add=(geo,m,name,y,outline=true)=>{
    const mesh=new THREE.Mesh(geo,m);
    mesh.name=name; mesh.position.y=y; mesh.castShadow=true; mesh.receiveShadow=true;
    const L=G.LAYOUT[name];
    if(L){mesh.position.y=L.y; mesh.scale.set(...L.s);}
    if(outline){
      const line=new THREE.LineSegments(new THREE.EdgesGeometry(geo,20),lineMat);
      line.userData.outline=true; mesh.add(line);
    }
    group.add(mesh);
    return mesh;
  };
  const box=(half,h)=>new THREE.BoxGeometry(half*2,h,half*2).translate(0,h/2,0);

  // 基壇と、その上面の浅い屋根（いちばん下の屋根）
  add(box(G.BASE.half,G.BASE.h),woodMat,'基壇',0);
  const capInner=G.BODY.half[0]*0.95;
  add(roofGeo({...G.BASE_CAP,inner:capInner,thick:0.05}).top,woodMat,'基壇の屋根',G.BASE.h);   // 裏は基壇に隠れる

  // 屋根 2〜5 の裏（下面）は黒にして、1 つのメッシュにまとめる（原点 = 底面の中心。屋根と同じ位置・倍率を焼き込む）
  const unders=[];
  const roof=(opts,name,ry)=>{
    const {top,under}=roofGeo(opts);
    const m=add(top,woodMat,name,ry);
    m.updateMatrix();
    unders.push(under.applyMatrix4(m.matrix));
  };

  // 胴と屋根を下から重ねる。胴の上端 = その上の屋根の内の縁の高さ
  // 胴 4 段は 1 つのメッシュにまとめる（原点 = いちばん下の胴の底）
  let y=G.BASE.h+G.BASE_CAP.rise;   // 今の段の床（下の屋根の内の縁）
  const y0=y-0.1, bodies=[];
  for(let i=0;i<3;i++){
    const R=G.ROOF, half=G.BODY.half[i];
    bodies.push(box(half,G.BODY.h+0.1).translate(0,y-0.1-y0,0));   // 少し下へ潜らせて継ぎ目を隠す
    y+=G.BODY.h;
    roof({...R,outer:R.outer[i],inner:half*0.95},`屋根${i+2}`,y-R.rise);
  }
  // いちばん上: 胴は四角錐の屋根の下面に届くまで伸ばす
  const T=G.TOP, half=G.BODY.half[3];
  const roofBase=y+G.BODY.h;   // 四角錐の軒先の高さ
  const under=roofBase+roofY(half/T.outer,1,T)-T.thick;   // 胴の角の真上の屋根の下面
  bodies.push(box(half,under-y+0.15).translate(0,y-0.1-y0,0));
  add(mergeGeometries(bodies),bodyMat,'胴',y0);
  roof({...T,inner:0},'屋根5',roofBase);
  add(mergeGeometries(unders),underMat,'屋根の裏',0,false);   // 輪郭線は屋根の上面の側で引いてある

  const LB=G.LAYOUT['基壇'], LT=G.LAYOUT['屋根5'];
  group.userData.footprint={halfW:G.BASE.half*LB.s[0],halfD:G.BASE.half*LB.s[2]};  // 当たり判定用（ローカル XZ の矩形。基壇）
  group.userData.height=LT.y+T.rise*LT.s[1];   // 原点（地面）から先端まで。基壇は原点より下へも沈んでいる
  return group;
}

export const GOJUNOTO_SIZE=GOJUNOTO;   // 寸法
