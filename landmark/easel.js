import * as THREE from 'three';

// イーゼル（easel）— workspace/easel.html と同じ形
// 前の脚2本を「ハ」の字に開き（下半分は少し外へしなる）、その間の中央に柱（マスト）を立てる
// マストは前の脚より上へ出て、下は棚（下の横木）の下端で止まる。上の横木の高さでマストの背面から後ろの脚を奥へ開いて立てる
// 前の脚とマストに横木を2本渡す：上は脚の間、下はキャンバスを載せる棚で脚より外へはみ出す
// 棚に絵を貼ったキャンバスを載せ、上の横木に立てかける（image: 絵の画像 URL。null ならキャンバスなし）
// 原点 = 足元の中心、+z が正面、単位 1 = 1m
const EASEL={
  FRONT_H:1.6,          // 前の脚の高さ
  FRONT_TOP_X:0.267,    // 前の脚の頭の x（中心から）
  FRONT_BOT_X:0.467,    // 前の脚の足先の x
  LEAN:0.2,             // 前の脚の足先が頭より前(+z)へ出る量
  BOW:0.025,            // 前の脚の下半分のしなり（外へ）
  MAST_H:1.7,           // マストの頭の高さ
  REAR_BOT_Z:-0.6,      // 後ろの脚の足先の z
  LEG_W:0.09, LEG_T:0.04,             // 脚の幅・厚み
  BAR_H:0.1, BAR_T:0.035,             // 上の横木の高さ・厚み
  BAR_Y:1.385,                        // 上の横木の中心の高さ
  SHELF_Y:0.745, SHELF_W:0.94,        // 棚の中心の高さ・長さ
  SHELF_H:0.1, SHELF_D:0.08,          // 棚の高さ・奥行き
  CANVAS:0.62, CANVAS_T:0.03,         // キャンバスの一辺・厚み（正方形）
};
const easelMat=new THREE.MeshStandardMaterial({color:0xa08766,roughness:0.85});
const easelLineMat=new THREE.LineBasicMaterial({color:0x161616});
// キャンバスに貼る絵（PNG を data URI で内蔵）
const EASEL_IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAT5klEQVR4AcVbaWxc13X+3pt9405KJEWt1L7SkmxLsrPYsZ3Ghu3CSVoHTlLYTQsYTVzkR9EALeAfbVGgQVskLWIEQWs4qWOkRlu7drzJjixblm0t1kJJlChRJLVwJ4ez76/fecOZeTPzZqEluwccvjv33XvuOeeee+45595RNAKqQTAGnLsKZMqbSdUzH4fx2mAMNbBUG+EzeacowI5OG370BR/cNn6pAGqF+kK1lU1UcwTXAmkcuBzPM789M4YfJA7jtvSVQv/PoCTU2CzmNOWGkwk5MZbETw6HMB/L5KrLnnUIwAJY+TGBgakUosmCZnw1NYjVmVnck7po0vrmVcmIyXRh3EqYRQiHRhL4GbU0ljJvX1sAFjbxOMrGkPGPX0/AiPaUuhQBxYETlqVl7f+/KoS+w6MJvDFITTUhQqlpA6TTbAi4OF5kB4ZmU/ir/QEE4uVoRTnLa01Gv8lV1cbt9FnwT19rhNdevHRqa4AQ2eACvM48uTL77wzFEU6Ys2lem+9esSCGy2lV0OJS0eRUId/rhUanhkf7ArhzVYT2oZyCiVAa56dTZeisZTVmFWIDupqBSBxIZXSjIgamfBizztXrhMeuBgvu7XVgd7cdnT5VN3AJSvnA5QR+eSICfzRTc6zbV53FV7e9y81KQcPxPXi1f0fRwGIPBqaS2NllK6qvTwDSpdENdFII12YxR4Jm+BEQBj6tIGSWv7/Hg11kvNSo21khQrmFBL90LobfXoghXsGQKYqGtR3XdHpUlu/sPYfXz25DOlNQcKHxKnetUii0KH1T+l30UQTAT5ialCQunfFFqKkRpaB78jYPbltWzryxXZtbxeM73fjhPm/Vrc/roL+yAFK2KMVbn5CZKF8BqF8Aglz8ge4WqF1NRetTmJEBFgMurvVlVP16QHDv6bFj33K7aXONan95pj3/bibsQ1orZ63BWU5leas8mgoFCqFxWRMcDkuREEQCuiDkya65jxkWedfgUOGq4qGV9hPZP7DBCVkaZvBK/y348PJaaqYF5yc6kTGof669mcDrtwE5LHw2N9iwtN2FwAi3Ry6EPEks6C5xvmJBM7hWjHZCBLWiyYJGkxkxDFNWXNtqxa3LbHifzk0phOMOPPPe3Whw7kMo7iwaT2/LMWUrLIXFawAxeFxW7NneTAcxy6kwp3+MXBpHYjNpKR+ZSZnFPVTnSrNp7Gosy3CP7XDrW6SxPlfOUO39UTc3qnK2ZP9f01I+3+Utc9iqPGUGv7S7DSu63FR7YasOkGb8yGNDu1U3fnX0KmvSTbvxnT53VYNY2knGFBvS7ilnt7ymtHeF7y2NdnznwR60NtlNhSCDloIMJmoos+h1mLUo7VH+XXrdtdqBP9mV1YRaWOR9L5fOH25zm8Z05q4wVTkRzyBEd9dGY+VptkAV3S2BDOPho2f9+Lf/GsX4dEyPmHPRtbTOrQgpS/cVTVY8wS1t61Kbrgkl6LJfxYikwtneVg9VxnyOpNm1YBov9kd1myA+Qm68HF6JGMVmPH6LB0u85nhMBTA3lsD+f5/E1GhcZ3x1nwd3/kEbXCbblhByZTyKlw+M4egZPwKhFC2wRmFo+h5rIedNNHaigvevd2IpNaBclAskaxlkpo5BG/+QxjQNtX0n1KV7KL3ytZtjUnISlzhREpafmUzBz9DXScZlvd+1xoHtFLZE9JXAVADC/Ln3A/k+ssy33d2ELzzalq8rLaRJyfh0HBeGQ5icjSMxHYIzFtclv77NhjauPzFi1UCLzyHd/zMgncw2U22wbPg2FG9PtW6LehcavAz/wHk0blgH39rVMBXt7DX6/AbQZ/lsxFBTXpSZ7u5w6h/9LV1mXJkpb1itJjJRYF7aZRhvhEdvqgCE+djElE6FCMBUOTpWFiK/HL0Wem6LArupbKujyIivWjyOojISvYnQtGUDnEvb0bhpg47VlMq++5owNhjF9LWsw2Gzq9h4R8PiyHCZu63mSMR8kXE3EykOjhOf15spzha6jCvNu3zKWu+qlZBPDkxtgJjTKC3s4FHm0xhC9mx0oWeTG4vSAomWTo1ko6bcaDWftOTh69Bmz1EeNJatm6G4xMcv1oqaaBbRwFwAi0BQsakYjkFmkSSb9DmBDDkZzuDUeFLfGSRkl4xwL3eEnd10373czktkecMCCE/+BeLBF2D3PgTvkp8WsyrMD44VHILitzf127A/jWePR3CSzKdMEqYeusL39jrxza2uorTYDQtg9tJKaJkQvUEnWnqvFjOVZkx+lnXh4l2luNGNfxtgquvvDgQxu5CkqYRRtvM7GIM8tderp96knakRrITArN7ufRCJ0EvUgIfLX0tGmfmDG9MC2gUlipT1LJK248io1CikoWhtsCW3YH6+D/98SKnJvBAnS+QQM8Qb2uN4cKNTtyz1aUAmDW2GMxkNQGlfAbh8RFeymGQEM5BRz5Nov7i3i4UUEvb3EHU9SwFcZGfiMji8Gc2KX77zFH53+suG2tpjSED1j8wQe2gfamtA2I/Mhy8iM/gRfXRui55mqFvvhrr9Hh7PlPsLZcOL3q2iJT9JR0r81jpBZj3ifgYx53+zx4JnWNJ3LtSMIxd3Lop5QSEZ4pG5NDZ1WM0dofw48QjS+3+OzNmDjI6Yc8twTQenKZDfIPnaP0CLBfNNqxYczMS2itbUB5qSIPM/JfMvsoM584LpyvQqhGPe+pAaWolpGprLJghNPcFsWwY0p9+GduUMtV1DolNBZB3JaeWMUq2VkfNIvPX30BI1VJttNQpOa3Yjk0gizfggHWPkGE/Q003p7wy0sagh7niVzL/McnFis7gdEIg06mnw0vp6vl+Zz2aIKy+BWBha/zv6rCepwbHlREt1TjeRRDp59nFGeyMjSJ16EbZd3y0ek0ynIzHELgwjen4Y8ZHrSExQc8LUIrEJgspigcVhh63BB3tLM5wdbfy0Q/FE9DUvhq4WWC0pISmHslbzove5FHtFAWiTw/TK5hiKUvs7OAr/BCTZGu9RYAlrsDBgzJw9xHPoR7mfUCpkLjE+jcDBowgd6UfKzyWywHC2d+G/lk5TIxJIBkOIXBPLziF4AOPZNwTbnmywUmhtXlrSdB0WNc19vyIb5h1Z29OYzQ9W7hmhPy6qy+WbYV7CCCKERLsCV5BLIRSF5p9AImqD/81DCB09A42qXYlxI57SspbirLedZXV9xrK7ZRQdjWO4PttTiqrqd0mUyN0Bgco2wEmuVb4mTapJJMwdKA/T//EKrv7NMwgePkmbQKNVYdbzHaoU1BZ/xbeZsBuJs2uRnm3U2zjtUdyz4391LajYqeSFKLIkZyQ7JaAOX4sgEuM+XyJ0ZclqKI0dUCgA53AGalRvr/9TOMF2hu4yUem0ikD/VeizV4qk0KXukmKpbPjS422IH9+C5MWVeXx3bHobX9zyZl1CEHuxmydR39vtzmeJLNfw8NOHPpmBP5hkMsMFV+7Aw8Zkp8MLbfQUVKaZbLM0erRhIgjnVQ1WWd5E6B9vYSxQhz+QJ7l6wb55EKrPfGdRbEyTOROw9oxB9WRnRGzApmWnSHeE+ZeVSCSFlgWDtTCUMC6B0HeZTZaMsofhfQ4sq/oef3qeebwzl4L4+PQcupjV6Wyjm8heSksX43MPtKnLULhtieGz0jSo9IfkOCQ078X8dZ4XiiRuElg7ZmHtmjTFpjhIw5LpPPO5RhZLGr2dA7h17SE0e2e4tbZQc1v0zPOGNise2ezC93Z5sHkJU2wl4aBy/5OHi5RfDj1+8Nhq7N1OJMIXE5WJgX5Ef/trWJOTUKmiybgN4TkvIgE3X9885oUh67Jx+L71EqVceSnkGDd/qvAF/xb2xJfMX5fUGkxZ9k04msJPfjWEBo8VW3p9iJw4j8nnXkM6IE2pEYsA2eutzQ2wNPn0p2IlDtqJ1HyQvsEYMhGDYVnAmxrrQHJwJWzrhxYxUqGpNbWeQdLthYoapTIBSHsRwr88P4S/3BVH5pU3spa9BqLS1xaPC62P3AvPLmZ1HA6m96kpukZRBvRFxUcI7P8AgfeO6V5hvj+NamT/PnjbZ2GpsiPk2xsKCvdsT/iHdFzrt0mWdbv/+GkDjnwxyEsA4fMjWJ+YKDEp+SYVC4rNirZvPQDf3j6o9PaEed2m6GuKZW6vVo8Trk1r4OhZiui5oSIhawk7kpdWwMbloHpN9mDTkVW4o38KR+Juvq1/WRbMoQnST5TsrS+TV1WrvLdth/f27TqjeZ+GlkZ2SSFNl4M8KQj3tvVo/cZ9UOxZxySHOONvQPD5hxB9fzcdq+J3uTa5p0Lf3BX9I55DfJ1VVVnKdck/TZdA7m1IsWNYbcaOdNZVzdVXe1pbGtHy0F00lllCUokMLh0JYORkSBfA8s0e9O5p1I/cRBrUB/hu24b40BXMHzhShFpL2BB7fxfiR7fC0XcG9i0XoDYE6TLTOZGdJ8VYAjvhin2T676PfcsFRW8bc9y5xNwISY1MOvsYQIqPJ1BVALLVTSiLCzd9e3bARsMnEA+ncfBXY7h8NKgfl0nd5U8CGDjkx9f+fDl3WPrjIgRS5rtjp24PxD6UghZzIHb4Fv0ju4NiT0KxpRhMebHs/t+HxS6+uuhWAcJcOSdOK7hwKcu8RPICYofbW4G+bRpWLq9DX7jzZnvW+d9H1RdauHvi0K8nMMTZl7PCPLA4MRTFu8+NGbxPBba2JlhbGWrWAp79i0AyQQ9Scwoyeh6wmPmpaeCl1xQcPwWE6FPlmBfUKXqxY/RiX39bwUGm0iouGEkl/9ntHty+hSGqiK1OkG1PIDibxMWP5w1MFiMYOhpAcuEOr4hHsdFJ8ZZEXcVdyr5pFGyaDpoRhOG33lUwM2usLS+LUPoHqiyBH33Ry4NNCxlYiRltDv6T/eVYqtWQOCGwFKRGlpY447nQQeYvypn9BbbCb+9GqxbBEi3Ee8dz6MwE4UA2e1OKS75LsiUHgu8Tqn0t5nPt5Vlxaht5h09Ati9HU3ZW9Yoa/1JzAdh5muNttWFJrxvjg9ltTBjn6iUrZJwWaN/DrWxXUMCp+QT6py2Iqa24CC5SAluiRYtiZ/oa9qRH0ajFSlY66TO4tkw24eKQ3rXufxUF8CHTx19YaecWlMT8wMW6EYY+Po2Wh2UXUHDfk8tw5H+mMMtL1Um6zBqNnZeXozbta8SKzXK9JouWuoIj/X7EuGMYQQQ2rbjxhnUtPrT04P7UeQqDSZCFVJlMjmovnEH6F6y9EUetckUBvPrBKDo/Ogt7MsZ1Vv/Bxvy7R+DltmbvlAsVVtz5bV5Z4+0NMYRCsIWp6BzjQpyordwrePMD8wAox8A8D15+Y9uKOcWFr6Qu6UJQ6WFanAWvTzTAsCJyXfWn2xrClraPeVljGpfnN2LIv4l3CXlUVtRq4cvyjB9fj52EJTS/KOalezoQwti/Po/49SlZ7DqzwrSVIWgR83wnzM+Hkvj5i8O4PslY2wAS5va0DWPz8k/Q5BGLxhiC5L5l7cURS7eghqONlzYNDpRRsAZUenFT6zFsbz+MVQ0D2Nv1BjrcV/X6IgHYmP6RX3s8kTymG6JSJPV+T45NYfTHz+KdV89jPpC9MlPaV26UjFyP4MfPXtSv1pS+724dxSN7n8M39j2HB3b/J9yM9wVECLIk/NQE97KurLe50FkcnAX/a6Gm8HBZwzwY5YkSRWdX4/DamNAkWH1qCg3pCNbwlx5ibJZlAvk1Vui++NL5oAO/eH0GzR9FsHGlF2t6PHrChQEiQpEUjg/M4xgvWMmdIjNo8U6hxTfN63BM1FAYXmeQl9Wz26Qwf5q7RZ94MgZgghnNzcD0jKFyoXjRvwVd3mGeBgUwGenGWCTb1/rX7uNQppmE0G20KJY5tC2f4tUdC+8NuBELFdadWWsxXseopilmT6d4X0g+B4+bUGXWeaFubK4H43PdaPNN4fLEWgSjhZ1IqLzg7uERHW+wG4AxGDat1/DeYc5zCSvj4R68OvQYj8sZhSaa+RMal97T6k7HqVb0rauAqyEClzfGbStOlZtBKmnFzGgbnR2K3ASSVNMhxhA3ApPzS/HCwSfgdQUxE2xHNJElOIdzUqEnSCZLrfiGtTz1GebV+Ou5ltmnnsFKNiDEjxHUDA8wakEs6EIs7EQ6lXWLrfTDnb4YjwaLvbAcnrhiRZiB1I2A3ACfDbVhdCp3/FXs7spqNvGzwOgbX75DQ+eSrAGuRoMERqocUdUCISYacHEJZOWdYdIiGbPxU85knHNyQu3EYmOIWjSUvm/gTdNKBq+JWfPf+4qGvq08y+UqMe4OUubuiY3rePv8PuY4SxFX+h5iDlCWgpwTBqcb4J8oDlyE8eOWLvzOugpTjCBLlmAltJ+6fh3vHtpyXqCDbCwlPXIzbY7BwEyIjGvYe6uGbZt5o1RO5+ezdqHBp6G7k3evuHolJK5bAELp1EhHGcFJ7hknLJ3Yb12Dyc+BcSFAZn4vDzd0/mVlrKK+Ny0YxGbuhRJSUxAy27I1il3QnRJ5lMCiBGDsK5ZekiUvWzdghM/PesaNY29lenvr0gXS5QddPsOuJFJpoDBEE+qATyUAUXeZ8QNUd9GAzxMkSJPfEOV/ayCWUM4UcwZBZiJW267laF60AMS6v2Ddin7+OvTznHUhWK68fZ85ilXNBrJF3eVK7jJGkHIresEG5Bis9TRgqtWUqSXFhhds23Ba5Zr7nEF+Y/QUf2J3K8/2ZNkXwXSQQYUYaL7Rf85W/9TUJQDZ0k5yxt+m2o8r5s5PEUE3+cs6Hm9JdmoVT3SNW1rRMML4p4D/A96nISlA1lQwAAAAAElFTkSuQmCC';

function easelMesh(geo){
  const mesh=new THREE.Mesh(geo,easelMat);
  mesh.castShadow=true;   // 自分の影は受けない（看板・柵と同じ）
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,15),easelLineMat));   // しなりの分割線は出さない
  return mesh;
}

// p0（下端）→ p1（上端）の角材。bow(t) で t（0=下端〜1=上端）ごとにローカル x へずらしてしならせる
function easelBeam(p0,p1,w,t,bow){
  const dir=p1.clone().sub(p0), L=dir.length();
  dir.normalize();
  const geo=new THREE.BoxGeometry(w,L,t,1,bow?16:1,1);
  if(bow){
    const pos=geo.attributes.position;
    for(let i=0;i<pos.count;i++)pos.setX(i,pos.getX(i)+bow(pos.getY(i)/L+0.5));
    geo.computeVertexNormals();
  }
  const x=new THREE.Vector3().crossVectors(dir,new THREE.Vector3(0,0,1)).normalize();
  const z=new THREE.Vector3().crossVectors(x,dir);
  const mesh=easelMesh(geo);
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,dir,z));
  mesh.position.copy(p0).add(p1).multiplyScalar(0.5);
  return mesh;
}

export function createEasel({image=EASEL_IMAGE}={}){
  const E=EASEL;
  const group=new THREE.Group();
  group.name='イーゼル';

  // 前の脚の面：高さ y での脚の中心の x と z
  const legX=y=>E.FRONT_BOT_X+(E.FRONT_TOP_X-E.FRONT_BOT_X)*y/E.FRONT_H;
  const legZ=y=>E.LEAN*(1-y/E.FRONT_H);
  const tilt=-Math.atan2(E.LEAN,E.FRONT_H);   // 前の脚の面の傾き（上ほど奥）

  // 前の脚。下半分（棚より下）だけ外へしなる
  const tb=E.SHELF_Y/E.FRONT_H;
  [-1,1].forEach(side=>{
    const bow=t=>t<tb?side*E.BOW*Math.sin(Math.PI*t/tb):0;
    group.add(easelBeam(
      new THREE.Vector3(side*E.FRONT_BOT_X,0,legZ(0)),
      new THREE.Vector3(side*E.FRONT_TOP_X,E.FRONT_H,legZ(E.FRONT_H)),
      E.LEG_W,E.LEG_T,bow));
  });

  // マスト（前の脚と同じ面）。下端は棚の下端に揃える
  const mastFoot=E.SHELF_Y-E.SHELF_H/2;
  group.add(easelBeam(
    new THREE.Vector3(0,mastFoot,legZ(mastFoot)),
    new THREE.Vector3(0,E.MAST_H,legZ(E.MAST_H)),
    E.LEG_W,E.LEG_T));

  // 後ろの脚（上の横木の高さでマストの背面に当て、奥へ。頭は横木の上端に揃える。正面からはマストに隠れる）
  const rearTopY=E.BAR_Y+E.BAR_H/2;
  group.add(easelBeam(
    new THREE.Vector3(0,0,E.REAR_BOT_Z),
    new THREE.Vector3(0,rearTopY,legZ(rearTopY)-E.LEG_T),
    E.LEG_W*0.8,E.LEG_T));

  // 横木（前の脚とマストの前の面に付ける）
  const bar=(len,h,d,y)=>{
    const m=easelMesh(new THREE.BoxGeometry(len,h,d));
    m.rotation.x=tilt;
    m.position.set(0,y,legZ(y)+E.LEG_T/2+d/2);
    group.add(m);
  };
  bar(2*legX(E.BAR_Y),E.BAR_H,E.BAR_T,E.BAR_Y);        // 上：脚の中心から中心まで
  bar(E.SHELF_W,E.SHELF_H,E.SHELF_D,E.SHELF_Y);       // 下：キャンバスを載せる棚

  // キャンバス：棚の上に載せ、背面を上の横木の前の面に当てる。絵は正面(+z)だけ、ほかの面は生成りの布
  if(image){
    const C=E.CANVAS, T=E.CANVAS_T;
    const tex=new THREE.TextureLoader().load(image);
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=4;
    const cloth=new THREE.MeshStandardMaterial({color:0xf2ede2,roughness:0.95});
    // 照明でくすまないよう、絵は少し自ら光らせて元の色に近づける
    const art=new THREE.MeshStandardMaterial({map:tex,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:0.45,roughness:0.9});
    const geo=new THREE.BoxGeometry(C,C,T);
    const canvas=new THREE.Mesh(geo,[cloth,cloth,cloth,cloth,art,cloth]);   // +x,-x,+y,-y,+z,-z
    canvas.castShadow=true;
    canvas.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo),easelLineMat));
    // 傾いた面に沿って、下端が棚の上面に載る位置へ
    const yBottom=E.SHELF_Y+E.SHELF_H/2;
    const up=new THREE.Vector3(0,Math.cos(tilt),Math.sin(tilt));    // 面に沿った上向き
    const fwd=new THREE.Vector3(0,-Math.sin(tilt),Math.cos(tilt));  // 面の正面向き
    const base=new THREE.Vector3(0,yBottom,legZ(yBottom)+E.LEG_T/2+E.BAR_T);   // 横木の前の面の高さ yBottom の点
    canvas.position.copy(base).addScaledVector(up,C/2).addScaledVector(fwd,T/2);
    canvas.rotation.x=tilt;
    canvas.name='キャンバス';
    group.userData.canvas=canvas;
    group.add(canvas);
  }

  group.userData.footprint={halfW:E.FRONT_BOT_X+E.LEG_W/2,halfD:Math.max(E.LEAN,-E.REAR_BOT_Z)+E.LEG_T};  // 当たり判定用（ローカル XZ の矩形）
  return group;
}

export const EASEL_SIZE=EASEL;   // 寸法
