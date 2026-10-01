# my-3d-parts
Three.js 3Dパーツライブラリ

> すべてのファイルは `createXXX()` 関数を export するファクトリー形式。`scene.add()` で使用。React 不要。

## parts（自然物・キャラクター）

- `sabchan.jsx` — サブちゃん・プレイヤーアバター・`createSabchan(scene)` / `animateSabchan(parts, t)`
- `kummo.jsx` — 雲生き物 kummo・`createKummo()`
- `gummo.jsx` — 雲生き物 gummo・`createGummo()`
- `forest1.jsx` — ローポリ球群の森・`createForest1()`・シード固定乱数・半透明球あり
- `lowpoly_rock01.js` — 岩・ローポリ・`createRock01Group(seed)`
- `lowpoly-grass1.jsx` — 草・ローポリ・`createLowpolyGrass1()`
- `DeadTree01.jsx` — 枯れ木・`createDeadTree(scale)`
- `GLeaf01.jsx` — 葉・`createGLeaf(scale, color)`
- `field01.jsx` — 草地フィールド・`createField01()`
- `EB_v87.jsx` — EB_v87・`createEB_v87()`
- `Frame.jsx` — ローポリ格子フレーム S/M/L・`createFrameS()` / `createFrameM()` / `createFrameL()`
- `Frame_6-4.jsx` — 6x4 ローポリフレーム・`createFrame64()`
- `Materis1.jsx` — ざらざら・`createMateris1()`・グレー/shininess:2
- `Materis2.jsx` — ツルツル・`createMateris2()`・ダークグレー/shininess:120
- `Materis3.jsx` — ライム発光・`createMateris3()`・emissive(0x88ff22)
- `Materis4.jsx` — ワイヤー・`createMateris4()`・青/wireframe:true
- `Materis5.jsx` — 頂点カラー・`createMateris5()`・赤↔青グラデーション

## landmark（建造物）

- `TORCH.js` — 惑星 coccolith ランドマーク #01・三角錐クリップ構造・発光あり・`createTORCH()`
- `lowpoly_torii01.js` — 鳥居・ローポリ・`createTorii()`
- `lowpoly_lighthouse01.js` — 灯台・ローポリ・`createLighthouse()`
- `lowpoly_windmill01.js` — 風車・ローポリ・`createWindmill()`・`update()` で羽根回転

## workspace（作業台）

- `index.html` — パーツ確認用の空の作業台・軸ポイント/地面/ライト付き・ドラッグ回転/ホイールズーム・`allMeshes` に追加したメッシュを HUD に一覧表示
