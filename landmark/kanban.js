import * as THREE from 'three';

// 看板（kanban）— workspace/kanban.html と同じ形。原点 = 脚の間の中心・地面、単位 1 = 1m
// 二本脚の板看板。弓なりの凸側(+z)が表で黒板、凹側(-z)は板張りの面だけ
// 板の継ぎ目（ラフの暗い線）をメッシュの辺にして、そこで少しずつ折り、中央が前(+z)へ出る弓なりにする
export function createKanban(){
  const H=1.2, W=0.6, T=0.04;   // 板の高さ・幅・厚み
  const LEG_W=0.085, LEG_H=0.2; // 脚の幅・脚の間の切り欠きの高さ
  const BOW=0.08;               // 弓なりの量（中央が前へ出る距離）
  const SEAMS=8;                // 板の継ぎ目（折れ目）の本数
  const BOARD={x0:-W/2+0.07, x1:W/2-0.055, y0:LEG_H+0.07, y1:H-0.06, t:0.012}; // 黒板（表=+z 側に少し浮かせる）

  const group=new THREE.Group();
  group.name='看板';
  const woodMat=new THREE.MeshStandardMaterial({color:0xc2c6dc,roughness:0.9});
  const boardMat=new THREE.MeshStandardMaterial({color:0x3c3a4c,roughness:0.95});
  const lineMat=new THREE.LineBasicMaterial({color:0x111111});

  // 折れ目の高さ（下端・継ぎ目・上端）と、そこでの奥行きのずれ（放物線上の点。間は直線でつなぐ）
  const KNOTS=[0];
  for(let i=SEAMS;i>=1;i--)KNOTS.push(H-i*(H-LEG_H)/(SEAMS+0.6));
  KNOTS.push(H);
  const KZ=KNOTS.map(y=>{const u=2*y/H-1; return BOW*(1-u*u);});
  function seg(y){
    let i=0;
    while(i<KNOTS.length-2&&y>KNOTS[i+1])i++;
    return i;
  }
  const zOff=y=>{const i=seg(y), f=(y-KNOTS[i])/(KNOTS[i+1]-KNOTS[i]); return KZ[i]+(KZ[i+1]-KZ[i])*f;};

  // 区間リスト A から B を引いた残り（[x0,x1] の配列）
  function diff(A,B){
    let out=A.map(a=>a.slice());
    B.forEach(([b0,b1])=>{
      out=out.flatMap(([p0,p1])=>{
        const r=[];
        if(b0>p0)r.push([p0,Math.min(p1,b0)]);
        if(b1<p1)r.push([Math.max(p0,b1),p1]);
        return r.filter(([s,e])=>e-s>1e-9);
      });
    });
    return out;
  }
  // 高さ y0〜y1、奥行き z0〜z1 の板を横帯に分けて組む。帯の横幅は spans(帯の中央の高さ) が返す区間
  // 帯の境目は折れ目を必ず含む（各帯が平面のまま折れ目で角になる）。extra は折らない分割（切り欠きの高さなど）
  function slab(y0,y1,z0,z1,spans,mat,extra=[]){
    const ys=[...new Set([y0,y1,...extra,...KNOTS].filter(y=>y>=y0&&y<=y1))].sort((a,b)=>a-b);
    const pos=[];
    const P=(x,y,z)=>[x,y,z+zOff(y)];
    const quad=(a,b,c,d)=>pos.push(...a,...b,...c,...a,...c,...d);   // 外から見て反時計回り
    const bands=[];
    for(let i=0;i<ys.length-1;i++)bands.push(spans((ys[i]+ys[i+1])/2));
    bands.forEach((ivs,i)=>{
      const ya=ys[i], yb=ys[i+1];
      ivs.forEach(([x0,x1])=>{
        quad(P(x0,ya,z1),P(x1,ya,z1),P(x1,yb,z1),P(x0,yb,z1));   // +z 面
        quad(P(x0,ya,z0),P(x0,yb,z0),P(x1,yb,z0),P(x1,ya,z0));   // -z 面
        quad(P(x1,ya,z1),P(x1,ya,z0),P(x1,yb,z0),P(x1,yb,z1));   // 右側面
        quad(P(x0,ya,z0),P(x0,ya,z1),P(x0,yb,z1),P(x0,yb,z0));   // 左側面
      });
    });
    // 帯の境目で上下の幅が違うところに蓋をする（上端・下端・脚の間の天井）
    ys.forEach((y,j)=>{
      const below=j>0?bands[j-1]:[], above=j<bands.length?bands[j]:[];
      diff(below,above).forEach(([x0,x1])=>quad(P(x0,y,z1),P(x1,y,z1),P(x1,y,z0),P(x0,y,z0)));   // 上向き
      diff(above,below).forEach(([x0,x1])=>quad(P(x0,y,z0),P(x1,y,z0),P(x1,y,z1),P(x0,y,z1)));   // 下向き
    });
    // UV は正面から見た x,y を板の外接矩形で 0〜1 に正規化（黒板に表示用のテクスチャを貼れるように）
    const xs=pos.filter((_,i)=>i%3===0), xMin=Math.min(...xs), xMax=Math.max(...xs);
    const uv=[];
    for(let i=0;i<pos.length;i+=3)uv.push((pos[i]-xMin)/(xMax-xMin),(pos[i+1]-y0)/(y1-y0));
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geo.computeVertexNormals();   // 頂点を共有しないので帯ごとにフラットな陰影になる
    const mesh=new THREE.Mesh(geo,mat);
    mesh.castShadow=true;  // 自分の影は受けない（薄い板だと影マップのアクネで表面がまだらになるため）
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,25),lineMat));   // 折れ目は緩い角なので線にならない
    group.add(mesh);
    return mesh;
  }

  // 本体: 下辺の中央を切り欠いて二本脚にした板
  const w=W/2;
  slab(0,H,-T/2,T/2,y=>y<LEG_H?[[-w,-w+LEG_W],[w-LEG_W,w]]:[[-w,w]],woodMat,[LEG_H]);

  // 黒板
  const B=BOARD;
  const board=slab(B.y0,B.y1,T/2,T/2+B.t,()=>[[B.x0,B.x1]],boardMat);
  group.userData.board=board;   // 黒板のメッシュ（表示を貼るときに使う）

  group.userData.footprint={halfW:W/2,halfD:BOW+T/2+BOARD.t};  // 当たり判定用（ローカル XZ の矩形。弓なりの出っ張りまで含める）
  return group;
}
