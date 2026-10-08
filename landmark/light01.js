import * as THREE from 'three';
import { mergeStatic } from '../parts/mergeStatic.js';

// light01 — workspace/light01.html と同じ形
// サブちゃんの頭（顔なし）を横のリングに載せ、四角柱の棒で立てたライト
// 「ライト棒だけ」「ライト頭だけ（棒以外）」を別々にも使えるように分けてある
// 動く部品はないので、頭と組み合わせは mergeStatic で色（マテリアル）ごとに 1 メッシュへまとめて返す
// 形はサブちゃんのモデル単位で作り、頭がサブちゃんと同じ大きさになるよう U 倍して m にする
// （coccolith の SAB_SCALE と同じ。1 = 1m）
const U=0.168;
const LIGHT01={
  POLE_R:0.5, POLE_LEN:12.5,   // 棒（四角柱）
  RING_R:2.8, RING_TUBE:0.4,   // 横のリング
  TIP_R:1.0,                   // リングの中心の球
  HEAD_Y:3.92,                 // リングの中心から頭の中心までの高さ
};
const light01Mat={
  body:new THREE.MeshLambertMaterial({color:0xC8E2EA}),   // 頭・耳の当て・リング
  dark:new THREE.MeshLambertMaterial({color:0x20202c}),   // 耳のリング
  pole:new THREE.MeshPhongMaterial({color:0x323244,shininess:80,specular:0x6666aa}),  // 棒・中心の球
};

// サブちゃんの頭と同じ球（耳側ほど yz を膨らませる）
function makeHeadGeo(){
  const geo=new THREE.SphereGeometry(1.6,10,7);
  const pos=geo.attributes.position;
  const maxX=1.6, boundary=0.5;
  for(let i=0;i<pos.count;i++){
    const ax=Math.abs(pos.getX(i));
    const expand=ax<=boundary?1.05:1.05+((ax-boundary)/(maxX-boundary))*0.15;
    pos.setY(i,pos.getY(i)*expand);
    pos.setZ(i,pos.getZ(i)*expand);
  }
  pos.needsUpdate=true;
  geo.computeVertexNormals();
  return geo;
}

// モデル単位で組んだ子を U 倍して入れる外側のグループ（原点・userData は m）
function scaledGroup(name){
  const group=new THREE.Group();
  group.name=name;
  const inner=new THREE.Group();
  inner.scale.setScalar(U);
  group.add(inner);
  return [group,inner];
}

function buildPole(){
  const L=LIGHT01;
  const [group,inner]=scaledGroup('light01 棒');
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(L.POLE_R,L.POLE_R,L.POLE_LEN,4),light01Mat.pole);
  pole.position.y=L.POLE_LEN/2;
  pole.castShadow=true;
  inner.add(pole);
  group.userData.top=L.POLE_LEN*U;
  group.userData.footprint={halfW:L.POLE_R*U,halfD:L.POLE_R*U};  // 当たり判定用（ローカル XZ の矩形）
  return group;
}

function buildHead(){
  const L=LIGHT01;
  const [group,inner]=scaledGroup('light01 頭');

  const headGroup=new THREE.Group();
  headGroup.position.y=L.HEAD_Y;
  inner.add(headGroup);

  // HEAD
  const head=new THREE.Mesh(makeHeadGeo(),light01Mat.body);
  head.scale.set(6/3.2,5/3.2,4/3.2*1.1);
  headGroup.add(head);

  // EARS × 2（リング + 当て球）
  const earGeo=new THREE.TorusGeometry(1.5,0.3,4,13);
  const padGeo=new THREE.SphereGeometry(1.5,4,3);
  [-1,1].forEach(s=>{
    const ear=new THREE.Mesh(earGeo,light01Mat.dark);
    ear.position.set(s*2.5,0.10,0.0);
    ear.rotation.y=Math.PI/2;
    headGroup.add(ear);
    const pad=new THREE.Mesh(padGeo,light01Mat.body);
    pad.position.set(s*2.5,0.10,0.0);
    headGroup.add(pad);
  });

  // RING（横のリング）
  const ring=new THREE.Mesh(new THREE.TorusGeometry(L.RING_R,L.RING_TUBE,7,13),light01Mat.body);
  ring.rotation.x=Math.PI/2;
  inner.add(ring);

  // TIP（リングの中心の球）
  inner.add(new THREE.Mesh(new THREE.SphereGeometry(L.TIP_R,4,3),light01Mat.pole));

  inner.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  return group;
}

// ライト棒だけ。原点 = 棒の下端・高さ 2.1m・userData.top = 上端の高さ（頭を載せる位置）・userData.footprint 付き
// メッシュは 1 つなのでまとめない
export function createLight01Pole(){
  return buildPole();
}

// ライト頭だけ（棒以外: 頭・耳・横のリング・中心の球）
// 原点 = リングの中心（棒の上端に合わせる点）・+z が頭の正面・下へは中心の球の分 0.17m 出る
// 色ごとに 3 メッシュ（頭の色・耳のリングの暗い色・中心の球）にまとめる
export function createLight01Head(){
  return mergeStatic(buildHead());
}

// 棒の上に頭を載せたもの。原点 = 棒の下端・高さ約 3.2m・userData.footprint は棒のまわりのみ
// 色ごとに 3 メッシュ（頭の色・耳のリングの暗い色・棒と中心の球）にまとめる
export function createLight01(){
  const group=new THREE.Group();
  group.name='light01';
  const pole=buildPole();
  const head=buildHead();
  head.position.y=pole.userData.top;
  group.add(pole,head);
  group.userData.footprint=pole.userData.footprint;
  return mergeStatic(group);
}
