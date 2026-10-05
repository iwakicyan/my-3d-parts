import * as THREE from 'three';

// 橋（bridge01）— workspace/bridge01.html と同じ形
// 円柱の両端に円錐を付けた形を横に寝かせ（軸 = x。歩く向きはこれと直角の z）、ほとんどを地面に埋めて上の部分だけを出す
// 分割は円柱・円錐とも16。平らな面が真上に来る向きにして、歩く面を平らにする
// 地面に埋まって見えない下の半分（軸＝円錐の先端の高さより下）は面ごと削る
// 歩く向きは軸と直角（z）で、円柱のアーチを乗り越える。円柱と円錐の境目（アーチ形の縁）の少し内側に沿って、四角柱の棒を円柱の面に垂直に（x 軸まわりだけ傾けて）並べ、先端に正十二面体を付ける（地面に入るところまで）
// 昇り降りするところ（z の両端、円柱の面が地面に入るところ）に、橋と同じ色の高さ 50cm のステップを置く（幅は両側の柱の列より内側）
// 原点 = 地面の高さで、橋の真ん中。単位 1 = 1m
// cut・stepSink: 削る高さとステップを沈める量（水の上に架けるときは水面より下まで残す）。cut:'axis' で軸の高さ（下半分を削る）
const BRIDGE01={
  R:5.0,          // 円柱の半径
  CYL_L:6.0,      // 円柱の長さ
  CONE_L:4.2,     // 円錐の長さ（片側）
  ABOVE:2.0,      // 地面から出る高さ
  SEG:16,         // 分割数
  CUT:'axis',     // この高さ以下に収まる面は削る（'axis' = 軸の高さ。円柱・円錐とも下半分がなくなる）
  STEP:{
    H:0.5,          // ステップの高さ（置いたあと地面に埋めることもあるので高め）
    D:1.5,          // ステップの奥行き（橋の面から外へ迫り出す長さ）
    IN:0.2,         // 橋の面の中へ潜らせる奥行き（すき間が出ないように）
    SINK:0.1,       // 地面に沈める量
    GAP:0.1,        // 柱の列の内側からのすき間
  },
  POST:{
    SPACING:0.6,            // 柱の間隔（縁に沿った長さ）
    ROD_W:0.10, ROD_L:0.8,      // 棒（四角柱）の太さ・長さ
    KNOB_R:0.11,            // 先端の正十二面体の半径
    INSET:0.15,             // 縁から内側（円柱の側）へ寄せる量
    SINK:0.03,              // 根元を面に沈める量
    MIN_Y:0.1,              // 縁のこの高さより上だけに立てる
  },
};
const bridgeMat=new THREE.MeshStandardMaterial({color:0xd6dbda,roughness:0.9,flatShading:true});
const bridgeLineMat=new THREE.LineBasicMaterial({color:0x2f3a3a});
const bridgePostMat=new THREE.MeshStandardMaterial({color:0x4a4a50,roughness:0.8,flatShading:true});

function bridgeMesh(geo){
  const mesh=new THREE.Mesh(geo,bridgeMat);
  mesh.castShadow=true;   // 自分の影は受けない（看板・柵と同じ）
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,31),bridgeLineMat));   // 面どうし（30°）の線は出さず、円柱と円錐の境目だけ
  return mesh;
}

// 三角形の3頂点がすべて yCut 以下にある面を消す（地面の下で見えない部分を削る。yCut を軸の高さにすると、先端が軸上にある円錐の下半分も消える）
function bridgeCrop(geo,yCut){
  const src=geo.index?geo.toNonIndexed():geo;
  const pos=src.attributes.position, uv=src.attributes.uv;
  const keepPos=[], keepUv=[];
  for(let t=0;t<pos.count;t+=3){
    if(Math.max(pos.getY(t),pos.getY(t+1),pos.getY(t+2))<=yCut+1e-6)continue;
    for(let k=t;k<t+3;k++){
      keepPos.push(pos.getX(k),pos.getY(k),pos.getZ(k));
      if(uv)keepUv.push(uv.getX(k),uv.getY(k));
    }
  }
  const out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.Float32BufferAttribute(keepPos,3));
  if(uv)out.setAttribute('uv',new THREE.Float32BufferAttribute(keepUv,2));
  out.computeVertexNormals();
  return out;
}

export function createBridge01({cut=BRIDGE01.CUT,stepSink=BRIDGE01.STEP.SINK}={}){
  const B=BRIDGE01;
  const group=new THREE.Group();
  group.name='橋';

  const cy=B.ABOVE-B.R*Math.cos(Math.PI/B.SEG);   // 軸の高さ。平らな上面が地面から ABOVE の高さに来るよう、地面の下へ
  if(cut==='axis')cut=cy;
  // 円柱・円錐はもともと軸が y。平らな面を真上に向けるため、軸のまわりに半分の分割角だけ回してから寝かせ（+y → +x）、
  // 軸の高さへ下ろして、地面の下に収まる面を削る
  const place=(geo,x)=>{
    geo.rotateY(Math.PI/B.SEG);
    geo.rotateZ(-Math.PI/2);
    geo.translate(x,cy,0);
    return bridgeCrop(geo,cut);
  };
  const walkable=[];   // 上を歩ける面（本体とステップ）。userData.walkable で渡す
  const addBody=mesh=>{ group.add(mesh); walkable.push(mesh); };
  addBody(bridgeMesh(place(new THREE.CylinderGeometry(B.R,B.R,B.CYL_L,B.SEG,1,true),0)));
  [1,-1].forEach(side=>{
    const geo=new THREE.ConeGeometry(B.R,B.CONE_L,B.SEG,1,true);   // 先端が +y（寝かせると +x）
    if(side<0)geo.rotateZ(Math.PI);                                // 先端を -y（寝かせると -x）へ
    addBody(bridgeMesh(place(geo,side*(B.CYL_L/2+B.CONE_L/2))));
  });

  // --- 昇り降りのステップ（z の両端） ---
  {
    const S=B.STEP;
    // 円柱の断面の折れ線で、高さ S.H になる z（上から外へたどる）
    let zH=0;
    for(let k=1;k<B.SEG;k+=2){
      const y0=cy+B.R*Math.cos(k*Math.PI/B.SEG), y1=cy+B.R*Math.cos((k+2)*Math.PI/B.SEG);
      if(y1<=S.H){
        const z0=B.R*Math.sin(k*Math.PI/B.SEG), z1=B.R*Math.sin((k+2)*Math.PI/B.SEG);
        zH=z0+(z1-z0)*(y0-S.H)/(y0-y1);
        break;
      }
    }
    const W=2*(B.CYL_L/2-B.POST.INSET-B.POST.ROD_W/2-S.GAP);   // 柱の列の内側どうしからすき間ぶん狭く
    const geo=new THREE.BoxGeometry(W,S.H+stepSink,S.IN+S.D);
    [1,-1].forEach(sz=>{
      const step=new THREE.Mesh(geo,bridgeMat);
      step.position.set(0,(S.H-stepSink)/2,sz*(zH+(S.D-S.IN)/2));
      step.castShadow=true;
      addBody(step);
    });
  }

  // --- 縁の柱（円柱と円錐の境目のアーチに沿って） ---
  const P=B.POST, a=Math.PI/B.SEG;
  const xE=B.CYL_L/2;   // 円柱の端（円錐との境目）の x
  // 断面の頂点：上から角度 phi（上面の縁が ±a、その隣が ±3a …）
  const ring=(sx,phi)=>new THREE.Vector3(sx*xE,cy+B.R*Math.cos(phi),B.R*Math.sin(phi));
  const rodGeo=new THREE.BoxGeometry(P.ROD_W,P.ROD_L,P.ROD_W);
  rodGeo.translate(0,P.ROD_L/2-P.SINK,0);   // 根元を原点に（少し面に沈める）
  const knobGeo=new THREE.DodecahedronGeometry(P.KNOB_R);
  knobGeo.translate(0,P.ROD_L-P.SINK,0);    // 棒の先端
  // 縁の点 p に棒を立てる。tilt: x 軸まわりの傾き（円柱の面の法線の向き）
  const addPost=(p,tilt)=>{
    const rod=new THREE.Mesh(rodGeo,bridgePostMat);
    rod.position.copy(p);
    rod.rotation.x=tilt;
    rod.castShadow=true;
    const knob=new THREE.Mesh(knobGeo,bridgePostMat);
    knob.castShadow=true;
    rod.add(knob);
    group.add(rod);
  };
  [1,-1].forEach(sx=>{
    // アーチの折れ線（断面の頂点を z の - から + へ）。縁から INSET だけ内側（円柱の面の上）
    const verts=[];
    for(let k=-(B.SEG-1);k<=B.SEG-1;k+=2)verts.push(ring(sx,k*a).setX(sx*(xE-P.INSET)));
    const segs=[];
    for(let i=0;i<verts.length-1;i++){
      let p0=verts[i], p1=verts[i+1];
      if(Math.max(p0.y,p1.y)<P.MIN_Y)continue;
      // 地面に入る区間は、高さ MIN_Y のところで切る
      const cut=(q,r)=>q.clone().lerp(r,(P.MIN_Y-q.y)/(r.y-q.y));
      if(p0.y<P.MIN_Y)p0=cut(p0,p1);
      if(p1.y<P.MIN_Y)p1=cut(p1,p0);
      const mid=(i-(B.SEG-1)/2+0.5)*2*a;   // この区間の円柱の面の真ん中の角度（= 面の法線の傾き）
      segs.push({a:p0,b:p1,tilt:mid});
    }
    const lens=segs.map(sg=>sg.a.distanceTo(sg.b)), total=lens.reduce((u,v)=>u+v,0);
    const n=Math.max(1,Math.round(total/P.SPACING));
    for(let i=0;i<=n;i++){
      let d=i*total/n, k=0;
      while(k<segs.length-1&&d>lens[k]){d-=lens[k];k++;}
      const sg=segs[k];
      addPost(sg.a.clone().lerp(sg.b,Math.min(d/lens[k],1)),sg.tilt);
    }
  });

  const halfL=B.CYL_L/2+B.CONE_L;
  group.userData.walkable=walkable;   // 地表と同じように上に立てるメッシュ（ゲーム側で地面の高さのレイキャストに加える）
  group.userData.footprint={halfW:halfL,halfD:B.R};   // 当たり判定用（ローカル XZ の矩形。地面の下も含めた外形）
  return group;
}

export const BRIDGE01_SIZE=BRIDGE01;   // 寸法
