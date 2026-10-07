import * as THREE from 'three';

// SShall — workspace/sshall.html と同じ形
// 円筒の塔の手前に正面の棟（アーチの両開き扉）、奥の右に別の棟を付けた建物
// 屋根は紫の寄棟（塔は円錐）、壁はクリーム色、足元にグレーの基壇
// 原点 = 塔の中心の地面、+z が正面（扉の向き）、単位 1 = 1m
const SSHALL={
  PLINTH:{h:0.4,out:0.08},    // 基壇（高さ・壁からのはみ出し）
  FRONT:{x0:-4.45,x1:1.5,z0:0,z1:3.6,h:3.4},   // 正面の棟の壁（x/z の範囲・壁の高さ）
  BACK:{x0:-1.6,x1:3.1,z0:-2.4,z1:0.3,h:3.4},    // 奥の棟の壁
  ROOF:{over:0.35,t:0.22,pitch:15},            // 寄棟屋根（軒の出・軒の厚み・勾配[度]）
  TOWER:{r:2.0,h:6.0,seg:12, roofR:2.55,roofH:1.5},   // 塔（半径・壁の高さ・分割数、円錐屋根の半径・高さ）
  WIN:{n:4,arc:58,top:0.75,h:0.65,rot:15,frame:0.1,out:0.07},   // 塔の窓（数・弧の角度[度]・上端の壁の上からの距離・高さ・回転[度]・枠の幅・枠の出）
  DOOR:{w:1.7,h:2.55,t:0.08},   // 扉（幅・アーチの頂点までの高さ・厚み）
  STEP:{w:2.7,d:0.9},    // 扉の前の段（高さは基壇と同じ）
};
const sshallWallMat=new THREE.MeshStandardMaterial({color:0xf7f1e3,roughness:0.9,emissive:0x6a6556});
const sshallPlinthMat=new THREE.MeshStandardMaterial({color:0x8f9e9c,roughness:0.9,emissive:0x262c2c});
const sshallRoofMat=new THREE.MeshStandardMaterial({color:0x7a6692,roughness:0.8,flatShading:true,emissive:0x221a2e});
const sshallDoorMat=new THREE.MeshStandardMaterial({color:0x8a6a48,roughness:0.8,emissive:0x2a1e12});
const sshallFrameMat=new THREE.MeshStandardMaterial({color:0x7a5a3a,roughness:0.8,emissive:0x22180e});
const sshallDarkMat=new THREE.MeshStandardMaterial({color:0x2c2a33,roughness:1});
const sshallLineMat=new THREE.LineBasicMaterial({color:0x2f3448});
const sshallConeMat=new THREE.MeshStandardMaterial({color:0x7a6692,roughness:0.8,emissive:0x221a2e});   // 円錐（なめらかな陰影）

export function createSShall(){
  const C=SSHALL, P=C.PLINTH, F=C.FRONT, B=C.BACK, R=C.ROOF, T=C.TOWER;
  const group=new THREE.Group();
  group.name='SShall';

  // メッシュ + 輪郭線（edge は線にする角度のしきい値。false で線なし）
  const add=(geo,mat,edge=20,parent=group)=>{
    const m=new THREE.Mesh(geo,mat);
    m.castShadow=true; m.receiveShadow=true;
    if(edge)m.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,edge),sshallLineMat));
    parent.add(m);
    return m;
  };
  const box=(x0,x1,y0,y1,z0,z1,mat)=>{
    const g=new THREE.BoxGeometry(x1-x0,y1-y0,z1-z0);
    g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);
    return add(g,mat);
  };

  // 寄棟屋根：軒の板 + 低い勾配の寄棟（棟は長い辺の向き）
  const hipRoof=(x0,x1,z0,z1,y)=>{
    x0-=R.over; x1+=R.over; z0-=R.over; z1+=R.over;
    box(x0,x1,y,y+R.t,z0,z1,sshallRoofMat);
    const yb=y+R.t, alongX=(x1-x0)>=(z1-z0);
    const half=(alongX?z1-z0:x1-x0)/2;
    const yr=yb+half*Math.tan(THREE.MathUtils.degToRad(R.pitch));
    const cx=(x0+x1)/2, cz=(z0+z1)/2;
    // 棟の両端
    const r0=alongX?[x0+half,yr,cz]:[cx,yr,z0+half];
    const r1=alongX?[x1-half,yr,cz]:[cx,yr,z1-half];
    const c=[[x0,yb,z1],[x1,yb,z1],[x1,yb,z0],[x0,yb,z0]];   // 手前左から反時計回り（上から見て）
    const pos=[], tri=(a,b,d)=>pos.push(...a,...b,...d);
    if(alongX){
      tri(c[0],c[1],r1); tri(c[0],r1,r0);   // 手前
      tri(c[2],c[3],r0); tri(c[2],r0,r1);   // 奥
      tri(c[1],c[2],r1);                    // 右
      tri(c[3],c[0],r0);                    // 左
    }else{
      tri(c[1],c[2],r0); tri(c[1],r0,r1);   // 右
      tri(c[3],c[0],r1); tri(c[3],r1,r0);   // 左
      tri(c[0],c[1],r1);                    // 手前
      tri(c[2],c[3],r0);                    // 奥
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.computeVertexNormals();
    add(g,sshallRoofMat);
  };

  // 棟：基壇 + 壁 + 屋根
  [F,B].forEach(b=>{
    box(b.x0-P.out,b.x1+P.out,0,P.h,b.z0-P.out,b.z1+P.out,sshallPlinthMat);
    box(b.x0,b.x1,P.h,b.h,b.z0,b.z1,sshallWallMat);
    hipRoof(b.x0,b.x1,b.z0,b.z1,b.h);
  });

  // 塔：基壇 + 円筒 + 円錐屋根
  const cyl=(r,y0,y1,mat,edge=35)=>{   // 分割の縦線は出さない
    const g=new THREE.CylinderGeometry(r,r,y1-y0,T.seg);
    g.translate(0,(y0+y1)/2,0);
    return add(g,mat,edge);
  };
  cyl(T.r+P.out,0,P.h,sshallPlinthMat);
  cyl(T.r,P.h,T.h,sshallWallMat);
  const roofGeo=new THREE.ConeGeometry(T.roofR,T.roofH,T.seg);
  roofGeo.translate(0,T.h+T.roofH/2,0);
  add(roofGeo,sshallConeMat,35);
  // 円錐の軒の厚み
  cyl(T.roofR,T.h-R.t,T.h,sshallRoofMat);

  // 塔の窓：暗い横長の開口 + 茶色の枠（円弧の板を縦に押し出す）
  // 角度 a は +z（正面）から +x へ回る向き。Shape の (x, y) → ワールド (x, -z)
  // 円筒と同じ T.seg 角形に沿わせる（r は角の頂点までの距離）。分割の角でだけ折れる
  const step=Math.PI*2/T.seg;
  const ring=(r,a0,a1)=>{
    const as=[a0];
    for(let k=Math.floor(a0/step)+1;k*step<a1;k++)as.push(k*step);
    as.push(a1);
    return as.map(a=>{
      const rel=((a%step)+step)%step-step/2;   // いちばん近い辺の中点からの角度
      const d=r*Math.cos(step/2)/Math.cos(rel);
      return new THREE.Vector2(d*Math.sin(a),-d*Math.cos(a));
    });
  };
  const arcSlab=(r0,r1,a0,a1,y0,y1,mat,edge=35)=>{
    const s=new THREE.Shape([...ring(r1,a0,a1),...ring(r0,a0,a1).reverse()]);
    const g=new THREE.ExtrudeGeometry(s,{depth:y1-y0,bevelEnabled:false});
    g.rotateX(-Math.PI/2);   // 押し出し方向 → +y、shape の y → -z
    g.translate(0,y0,0);
    return add(g,mat,edge);
  };
  const W=C.WIN, wy1=T.h-W.top, wy0=wy1-W.h;
  for(let i=0;i<W.n;i++){
    const ac=THREE.MathUtils.degToRad(W.rot+i*360/W.n), ha=THREE.MathUtils.degToRad(W.arc/2);
    const a0=ac-ha, a1=ac+ha, fa=W.frame/T.r;   // 枠の幅を角度に
    arcSlab(T.r-0.02,T.r+0.01,a0,a1,wy0,wy1,sshallDarkMat,false);                       // 開口
    arcSlab(T.r-0.02,T.r+W.out,a0-fa,a1+fa,wy1,wy1+W.frame*1.4,sshallFrameMat);         // 上の枠（少し厚い）
    arcSlab(T.r-0.02,T.r+W.out,a0-fa,a1+fa,wy0-W.frame,wy0,sshallFrameMat);             // 下の枠
    arcSlab(T.r-0.02,T.r+W.out,a0-fa,a0,wy0,wy1,sshallFrameMat);                        // 左の枠
    arcSlab(T.r-0.02,T.r+W.out,a1,a1+fa,wy0,wy1,sshallFrameMat);                        // 右の枠
  }

  // 扉：正面の壁の真ん中にアーチ形の両開き（左右の扉板 + 丸い取っ手）
  const D=C.DOOR, dr=D.w/2, ds=D.h-dr-P.h, dx=(F.x0+F.x1)/2;
  const leaf=s=>{   // s=-1 左、+1 右
    const sh=new THREE.Shape();
    sh.moveTo(0,0); sh.lineTo(s*dr,0); sh.lineTo(s*dr,ds);
    if(s>0)sh.absarc(0,ds,dr,0,Math.PI/2,false);
    else sh.absarc(0,ds,dr,Math.PI,Math.PI/2,true);
    sh.lineTo(0,0);
    const g=new THREE.ExtrudeGeometry(sh,{depth:D.t,bevelEnabled:false,curveSegments:2});
    g.translate(dx,P.h,F.z1-D.t/2);
    add(g,sshallDoorMat,30);
  };
  leaf(-1); leaf(1);
  [-1,1].forEach(s=>{
    const g=new THREE.TorusGeometry(0.105,0.027,4,8);
    g.translate(dx+s*0.18,P.h+1.05,F.z1+D.t/2+0.03);
    add(g,sshallDarkMat,false);
  });

  // 扉の前の段
  const S=C.STEP;
  box(dx-S.w/2,dx+S.w/2,0,P.h,F.z1+P.out,F.z1+P.out+S.d,sshallPlinthMat);

  // 当たり判定：棟2つ（基壇まで）と塔（外接する正方形）の矩形。ゲーム側で当たり判定に加える
  const colliders=[];
  const collider=(x0,x1,z0,z1)=>{
    const o=new THREE.Object3D();
    o.position.set((x0+x1)/2,0,(z0+z1)/2);
    o.userData.footprint={halfW:(x1-x0)/2,halfD:(z1-z0)/2};
    group.add(o);
    colliders.push(o);
  };
  [F,B].forEach(b=>collider(b.x0-P.out,b.x1+P.out,b.z0-P.out,b.z1+P.out));
  collider(-T.r-P.out,T.r+P.out,-T.r-P.out,T.r+P.out);
  group.userData.colliders=colliders;   // userData.footprint を持つ Object3D の配列（建物の原点が外形の中心ではないので矩形を分けて渡す）

  return group;
}

export const SSHALL_SIZE=SSHALL;   // 寸法
