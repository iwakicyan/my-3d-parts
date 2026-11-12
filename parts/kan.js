import * as THREE from 'three';

// 缶（kan）— 自販機（landmark/jihanki.js）の窓に入っている缶。workspace/jihanki.html のグループ2 と同じ形
// 横（ふたのない筒）に水玉とラベルの絵（kan.png。左右の端がつながる）を 1 周まき、天面・底面は明るい灰、フチにグレーのチューブ
// 色は平たく見えるよう自発光を足す（色に対する割合 KAN_GLOW）
// 原点 = 底面の真ん中・+z が正面（ラベル）、単位 1 = 1m（高さ 0.405m・半径 0.13m）
const S=1.8/520;   // 作業台のスケッチの 1 画素 (m)
export const KAN={
  R:38*S, H:117*S,   // 半径・高さ
  SEG:10,            // 周りの分割数（天面・底面・フチもそろえる）
  RIM_R:0.008,       // フチのチューブの太さ（半径）
  RIM_SEG:6,         // フチのチューブの断面の分割数
  LABEL_V:1-332/768, // 絵の中のラベルの真ん中の高さ（もとの画像 1024×768 の y=332。下が 0）
};
const KAN_COLOR={lid:0xd9dbdc, rim:0xb5b9bb};
export const KAN_GLOW=0.45;

// 作業台で整えた配置（缶の原点から見た位置と、フチの縦の倍率）
const KAN_LAYOUT={
  side:{y:KAN.H/2},
  top:{y:KAN.H}, bottom:{y:0},
  topRim:{y:KAN.H-0.00539, sy:1.98533}, bottomRim:{y:0, sy:1.7707},
};

const KAN_TEX_URL=new URL('./kan.png',import.meta.url).href;
let kanTex=null;   // 絵は 1 枚を使い回す
function kanTexture(){
  if(kanTex)return kanTex;
  kanTex=new THREE.TextureLoader().load(KAN_TEX_URL,tex=>{
    // 絵の縦は、水玉が丸く見えるよう缶の周りと高さの比に合わせて、ラベルを真ん中にして一部だけ使う
    const rep=(KAN.H/(2*Math.PI*KAN.R))/(tex.image.height/tex.image.width);
    tex.repeat.set(1,rep);
    tex.offset.set(0.5,KAN.LABEL_V-rep/2);   // 絵の横の真ん中（ラベル）を正面（+z）へ（筒の UV の 0 は正面）
  });
  kanTex.colorSpace=THREE.SRGBColorSpace;
  kanTex.wrapS=kanTex.wrapT=THREE.RepeatWrapping;
  return kanTex;
}

function glowMat(color){
  const m=new THREE.MeshLambertMaterial({color});
  m.emissive.set(color).multiplyScalar(KAN_GLOW);
  return m;
}

export function createKan(){
  const group=new THREE.Group();
  group.name='缶';
  const add=(name,geo,mat,{y,sy=1})=>{
    const m=new THREE.Mesh(geo,mat); m.name=name;
    m.position.y=y; m.scale.y=sy;
    m.castShadow=true; m.receiveShadow=true;
    group.add(m);
  };
  const L=KAN_LAYOUT;
  // 横：ふたのない筒に絵をまく
  const tex=kanTexture();
  const sideMat=new THREE.MeshLambertMaterial({color:0xffffff,map:tex,emissiveMap:tex});
  sideMat.emissive.setScalar(KAN_GLOW);
  add('缶の横',new THREE.CylinderGeometry(KAN.R,KAN.R,KAN.H,KAN.SEG,1,true),sideMat,L.side);
  // 天面・底面：横の頂点と角をそろえた多角形（裏返す向きで始まりの角度が変わる）
  const lidMat=glowMat(KAN_COLOR.lid);
  for(const [name,sy,l] of [['缶の天面',1,L.top],['缶の底面',-1,L.bottom]]){
    const g=new THREE.CircleGeometry(KAN.R,KAN.SEG,-sy*Math.PI/2); g.rotateX(-sy*Math.PI/2);
    add(name,g,lidMat,l);
  }
  // フチのチューブ：横の頂点と角をそろえる
  const rimMat=glowMat(KAN_COLOR.rim);
  const rimGeo=new THREE.TorusGeometry(KAN.R,KAN.RIM_R,KAN.RIM_SEG,KAN.SEG); rimGeo.rotateZ(Math.PI/2); rimGeo.rotateX(Math.PI/2);
  add('缶の天面のフチ',rimGeo,rimMat,L.topRim);
  add('缶の底面のフチ',rimGeo,rimMat,L.bottomRim);
  return group;
}
