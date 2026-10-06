import * as THREE from 'three';

// 土手（dote）— workspace/dote.html と同じ形
// 正方形の輪になった台形柱。内側は輪の天面の内縁から中心の1点へ収束するすり鉢（穴なし）
// 大きさは天面の幅の真ん中を結ぶ四角形で決める：一辺 size[m] か、面積 tsubo[坪]
// 天面の幅・斜面の角度は大きさによらず同じ。大きいほどすり鉢は深くなる
// 原点 = 外側の裾（y=0）の高さで中心、単位 1 = 1m
const DOTE={
  SIZE:10,     // 天面の幅の真ん中を結ぶ四角形の一辺（既定）
  H:1.2,       // y=0 から天面までの高さ
  RUN:0.9,     // 外側の斜面の水平の長さ（y=0 から天面まで）
  TOP_W:0.8,   // 天面の幅
  SINK:1.0,    // 外の斜面を同じ勾配のまま y=0 より下へ延ばす深さ（地面に埋まる分）
};
const TSUBO=400/121;   // 1坪（m²）
const COLOR_M=0x316b57;       // 一辺[m]で指定したときの既定の色
const COLOR_TSUBO=0x357884;   // 面積[坪]で指定したときの既定の色
const doteLineMat=new THREE.LineBasicMaterial({color:0x1d2a26});

// createDote({size:20}) → 一辺 20m、createDote({tsubo:30}) → 30坪。どちらもなければ一辺 10m
export function createDote({size,tsubo,color}={}){
  const D=DOTE;
  if(tsubo!=null)size=Math.sqrt(tsubo*TSUBO);
  else if(size==null)size=D.SIZE;
  if(color==null)color=tsubo!=null?COLOR_TSUBO:COLOR_M;

  const a1=size/2+D.TOP_W/2;   // 天面の外縁の半分
  const a2=size/2-D.TOP_W/2;   // 天面の内縁の半分
  const a0=a1+D.RUN;           // 裾（y=0）の半分
  const aSink=a0+D.SINK*D.RUN/D.H;  // 延ばした斜面の下端の半分
  const yApex=D.H-a2*D.H/D.RUN;     // 内側も外側と同じ勾配で中心まで下ろす

  // 正方形の4隅（反時計回り、上から見て）
  const sq=(a,y)=>[[a,y,a],[a,y,-a],[-a,y,-a],[-a,y,a]];
  const foot=sq(aSink,-D.SINK), outTop=sq(a1,D.H), inTop=sq(a2,D.H);
  const apex=[0,yApex,0];

  const pos=[];
  const tri=(p,q,r)=>pos.push(...p,...q,...r);
  const quad=(p,q,r,s)=>{tri(p,q,r);tri(p,r,s);};
  for(let i=0;i<4;i++){
    const j=(i+1)%4;
    quad(foot[i],foot[j],outTop[j],outTop[i]);    // 外の斜面
    quad(outTop[i],outTop[j],inTop[j],inTop[i]);  // 天面
    tri(inTop[i],inTop[j],apex);                  // すり鉢
    tri(foot[j],foot[i],apex);                    // 底（裾から中心へ閉じる）
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  geo.computeVertexNormals();

  const mat=new THREE.MeshStandardMaterial({color,roughness:0.9,flatShading:true});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.castShadow=true;
  mesh.receiveShadow=true;
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,20),doteLineMat));

  const group=new THREE.Group();
  group.name=tsubo!=null?`土手 ${tsubo}坪`:`土手 ${size}m`;
  group.add(mesh);
  group.userData.footprint={halfW:a0,halfD:a0};  // 当たり判定用（ローカル XZ の矩形、y=0 での裾）
  group.userData.bottomHalf=aSink;               // 延ばした斜面の下端の半分
  group.userData.size=size;                      // 天面の真ん中を結ぶ四角形の一辺
  return group;
}

export const DOTE_SIZE=DOTE;   // 寸法
