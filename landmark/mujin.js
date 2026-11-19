import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 無人販売所（mujin）— 手描きスケッチから。workspace/mujin.html と同じ形
// 4 本柱の台に棚板と幕板、奥に背板、左右の側面にカーテン、前が高く前へせり出す波板の屋根を斜めの支えで受ける
// 棚板の上に木のバット（ふたのない浅い箱）2 つ、棚の下の地面に木の箱
// 原点 = 床の真ん中、+z が正面、単位 1 = 1m
const MUJIN={
  W:1.5, D:0.85, H:1.87, P:0.06,   // 横幅・奥行き・柱の高さ・柱の太さ
  SHELF_T:0.06, APRON:0.12,        // 棚板の厚み・幕板の高さ
  WAVES:14, WAVE_A:0.018,          // 波板の山の数・高さ（±）
  VAT:{W:0.6, D:0.42, H:0.12, T:0.015},   // バットの横幅・奥行き・高さ・板の厚み
  CUBE:0.35,                       // 箱のもとの一辺（作業台で伸ばしてある）
};
const ROOF_LEN=Math.hypot(MUJIN.D+0.3,2.0-(MUJIN.H+0.03));   // 屋根の奥から前のせり出しまでの長さ
const BRACE_LEN=Math.hypot(MUJIN.D/2+0.3-0.05-(MUJIN.D-MUJIN.P)/2,1.96-(MUJIN.H-0.45));   // 斜めの支えの長さ（前の柱から屋根の前の端へ）

// 作業台で整えた配置：パーツごとの、原点から見た 4x4 行列（列優先）と色
const T=(x,y,z)=>[1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
const ROOF_M=(x,y)=>[1,0,0,0, 0,0.99624,-0.08663,0, 0,0.08663,0.99624,0, x,y,0.15,1];
const BRACE_M=x=>[1.12009,0,0,0, 0,0.56592,0.40915,0, 0,-0.58589,0.81039,0, x,1.82892,0.51316,1];
const VAT_M=x=>[1,0,0,0, 0,1.40399,0.20162,0, 0,-0.18277,1.27272,0, x,0.7211,0.16092,1];
const WOOD=0x9b7b5e, BOARD=0x957a63, CLOTH=0xdff0ee;
const MUJIN_LAYOUT={
  '柱 前左':      {m:T(-0.72,0.935,0.395),  color:WOOD},
  '柱 前右':      {m:T(0.72,0.935,0.395),   color:WOOD},
  '柱 奥左':      {m:T(-0.72,0.935,-0.395), color:WOOD},
  '柱 奥右':      {m:T(0.72,0.935,-0.395),  color:WOOD},
  '棚板':         {m:[1,0,0,0, 0,2.30368,0,0, 0,0,0.98842,0, 0,0.67046,0.04646,1], color:BOARD},
  '幕板':         {m:[1,0,0,0, 0,1.50899,0,0, 0,0,1,0, 0,0.64953,-0.37826,1],      color:BOARD},
  '貫 前':        {m:T(0,0.4413,0.395),     color:WOOD},
  '貫 奥':        {m:T(0,0.4413,-0.395),    color:WOOD},
  '貫 左':        {m:T(-0.72,0.33,0),       color:WOOD},
  '貫 右':        {m:T(0.72,0.4413,0),      color:WOOD},
  '背板':         {m:[1,0,0,0, 0,1.52186,0,0, 0,0,6.46041,0, 0,1.22931,-0.28147,1], color:0x272626},
  '梁 前':        {m:T(0,1.84,0.395),       color:WOOD},
  '梁 奥':        {m:T(0,1.84,-0.395),      color:WOOD},
  '梁 左':        {m:T(-0.72,1.84,0),       color:WOOD},
  '梁 右':        {m:T(0.72,1.84,0),        color:WOOD},
  'カーテン 左':  {m:[1,0,0,0, 0,1.06553,0,0, 0,0,1,0, -0.72,1.265,0,1], color:CLOTH},
  'カーテン 右':  {m:[1,0,0,0, 0,1.06553,0,0, 0,0,1,0, 0.72,1.265,0,1],  color:CLOTH},
  '屋根（波板）': {m:ROOF_M(0,1.9864),      color:0xd9efec},
  '屋根の桁 左':  {m:ROOF_M(-0.72,1.92755), color:WOOD},
  '屋根の桁 右':  {m:ROOF_M(0.72,1.92755),  color:WOOD},
  '支え 左':      {m:BRACE_M(-0.72),        color:WOOD},
  '支え 右':      {m:BRACE_M(0.72),         color:WOOD},
  'バット 左':    {m:VAT_M(-0.30609),       color:0xd9b187},
  'バット 右':    {m:VAT_M(0.30609),        color:0xd9b187},
  '箱':           {m:[3.30777,0,0,0, 0,2.23496,0,0, 0,0,1.23416,0, 0,-0.02192,-0.15996,1], color:0xc49a6c},
};

// 波板：横（x）に波打つ板。山 1 つを 4 分割
function roofGeo(){
  const {W,WAVES,WAVE_A}=MUJIN, RW=W+0.1;
  const g=new THREE.PlaneGeometry(RW,ROOF_LEN,WAVES*4,1); g.rotateX(-Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,WAVE_A*Math.sin(p.getX(i)/RW*WAVES*Math.PI*2));
  g.computeVertexNormals();
  return g;
}
// バット：底と 4 枚の側板。原点=底の真ん中
function vatGeo(){
  const {W,D,H,T}=MUJIN.VAT;
  return mergeGeometries([
    [W,T,D,0,T/2,0],
    [W,H,T,0,H/2,D/2-T/2],[W,H,T,0,H/2,-D/2+T/2],
    [T,H,D-2*T,W/2-T/2,H/2,0],[T,H,D-2*T,-W/2+T/2,H/2,0],
  ].map(([w,h,d,x,y,z])=>new THREE.BoxGeometry(w,h,d).translate(x,y,z)));
}

export function createMujin(){
  const {W,D,H,P,SHELF_T,APRON}=MUJIN;
  const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d);
  const post=box(P,H,P), railX=box(W-2*P,0.05,0.04), railZ=box(0.04,0.05,D-2*P);
  const beamX=box(W,0.06,P), beamZ=box(P,0.06,D), curtain=box(0.01,H-0.7-0.1,D-2*P);
  const keta=box(P,0.06,ROOF_LEN), brace=box(0.05,BRACE_LEN,0.05), vat=vatGeo();
  const cube=box(MUJIN.CUBE,MUJIN.CUBE,MUJIN.CUBE).translate(0,MUJIN.CUBE/2,0);
  // パーツの形（原点は作業台と同じ）
  const geos={
    '柱 前左':post,'柱 前右':post,'柱 奥左':post,'柱 奥右':post,
    '棚板':box(W+0.04,SHELF_T,D+0.04),
    '幕板':box(W-2*P,APRON,0.03),
    '貫 前':railX,'貫 奥':railX,'貫 左':railZ,'貫 右':railZ,
    '背板':box(W-2*P,0.78,0.03),
    '梁 前':beamX,'梁 奥':beamX,'梁 左':beamZ,'梁 右':beamZ,
    'カーテン 左':curtain,'カーテン 右':curtain,
    '屋根（波板）':roofGeo(),
    '屋根の桁 左':keta,'屋根の桁 右':keta,
    '支え 左':brace,'支え 右':brace,
    'バット 左':vat,'バット 右':vat,
    '箱':cube,
  };
  const lineMat=new THREE.LineBasicMaterial({color:0x4a4f5e});
  const edges=new Map();   // 同じ形の輪郭線は使い回す
  const edgesOf=g=>{if(!edges.has(g))edges.set(g,new THREE.EdgesGeometry(g,20));return edges.get(g);};
  const mats=new Map();    // 同じ色のパーツはマテリアルを共有する
  const matOf=c=>{
    if(!mats.has(c))mats.set(c,new THREE.MeshStandardMaterial({color:c,roughness:0.9,side:THREE.DoubleSide}));
    return mats.get(c);
  };

  const group=new THREE.Group();
  group.name='無人販売所';
  for(const [name,{m,color}] of Object.entries(MUJIN_LAYOUT)){
    const mesh=new THREE.Mesh(geos[name],matOf(color));
    mesh.name=name;
    mesh.matrix.fromArray(m);
    mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
    mesh.castShadow=true; mesh.receiveShadow=true;
    const line=new THREE.LineSegments(edgesOf(geos[name]),lineMat);
    line.userData.outline=true;
    mesh.add(line);
    group.add(mesh);
  }
  group.userData.footprint={halfW:W/2+0.03,halfD:D/2+0.03};   // 当たり判定用（ローカル XZ の矩形。柱の外側）
  group.userData.height=2.03;   // 屋根の前の端の高さ
  return group;
}
