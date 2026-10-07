import * as THREE from 'three';
import { mergeStatic } from '../parts/mergeStatic.js';

// 柵（saku_1）— workspace/saku.html と同じ形。原点 = 端（角）の杭の根元、単位 1 = 1m
// 細い角柱の杭の真ん中を、厚い横板2段が貫通する柵。杭の頭は上の板より少し上に出る
const SAKU={
  H:1.1,              // 杭の高さ
  POST:0.08,          // 杭の太さ（正方形断面）
  SPAN:1.2,           // 杭の間隔
  RAIL_H:0.26,        // 横板の高さ
  RAIL_T:0.1,         // 横板の厚み
  RAILS:[0.78,0.37],  // 横板の下端の高さ（上段・下段）
  OVER:0.18,          // 端の杭から横板がはみ出す長さ
};
const sakuMat=new THREE.MeshStandardMaterial({color:0xd2e3e2,roughness:0.9});
const sakuLineMat=new THREE.LineBasicMaterial({color:0x3b4656});

// 中心 (x,y,z)・大きさ (w,h,d) の箱を輪郭線付きで group に足す
function sakuBox(group,w,h,d,x,y,z){
  const geo=new THREE.BoxGeometry(w,h,d);
  const mesh=new THREE.Mesh(geo,sakuMat);
  mesh.position.set(x,y,z);
  mesh.castShadow=true;   // 自分の影は受けない（薄い板の影のアクネ避け、看板と同じ）
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),sakuLineMat));
  group.add(mesh);
  return mesh;
}

// まっすぐな柵。+x 方向へ spans 区間（杭は spans+1 本）、横板は杭の真ん中(z=0)を貫通する
// startOver: 始点側の横板のはみ出し（角では短くして、もう片側の横板の外の面で止める）
// firstPost: false で始点の杭を立てない（角で、もう片側の杭と重なるとき）
function buildSaku1({spans=2,startOver=SAKU.OVER,firstPost=true}={}){
  const S=SAKU, p=S.POST, L=spans*S.SPAN;
  const group=new THREE.Group();
  group.name='柵';
  for(let i=firstPost?0:1;i<=spans;i++)sakuBox(group,p,S.H,p,i*S.SPAN,S.H/2,0);
  const x0=-startOver, x1=L+S.OVER;
  S.RAILS.forEach(y=>sakuBox(group,x1-x0,S.RAIL_H,S.RAIL_T,(x0+x1)/2,y+S.RAIL_H/2,0));
  return group;
}

// 板・杭と輪郭線をそれぞれ 1 つにまとめて返す（ピースごとに描画 2 回）
export function createSaku1(opts){
  return mergeStatic(buildSaku1(opts));
}

// L字の角の柵。角の杭を原点に、A は +x 方向、B は +z 方向
// 両方の横板が角の杭を貫通して角で重なり、外へははみ出さない（互いの外の面で揃えて切る）
export function createSaku1Corner({spansA=1,spansB=1}={}){
  const group=new THREE.Group();
  group.name='柵（角）';
  const cut=SAKU.RAIL_T/2;
  const a=buildSaku1({spans:spansA,startOver:cut});
  const b=buildSaku1({spans:spansB,startOver:cut,firstPost:false});   // 角の杭は A 側の1本だけ残す
  b.rotation.y=-Math.PI/2;   // +x → +z
  group.add(a,b);
  return mergeStatic(group);
}

export const SAKU1=SAKU;   // 寸法（杭の間隔 SAKU1.SPAN で並べるときなどに使う）
