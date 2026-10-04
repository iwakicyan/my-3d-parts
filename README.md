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
- `2dgrass.js` — 板ポリ草の房・`create2DGrass()` / `create2DGrassField(positions)`（InstancedMesh）・山1つ/2つ/3つの板3枚を10°ずつ傾けて束ねる・原点=根元の中心・下部は地面にめり込ませて使う・テクスチャはPNGをdata URIで内蔵（形は workspace/2dgrass.html と同じ）
- `2dgrass2.js` — 板ポリ草の房その2・`create2DGrass2()` / `create2DGrass2Field(positions)`（InstancedMesh）・手描きラフの板3枚（ずんぐり四角形1.5倍・V字1.2倍・縦長）を角度をつけて束ねる・原点=根元の中心・下端は地面にめり込ませて使う・テクスチャはPNGをdata URIで内蔵（形は workspace/2dgrass2.html と同じ）
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
- `tou.js` — 塔・`createTou()`・原点=底面中心・幅9m×高さ12.6m・`userData.footprint` 付き（形は workspace/tou.html と同じ）
- `treehouse.js` — ツリーハウス・`createTreehouse()`・原点=幹の根元・高さ約11m・`userData.footprint` は幹のまわりのみ（形は workspace/treehouse.html と同じ）

## workspace（作業台）

- `index.html` — パーツ確認用の空の作業台・軸ポイント/地面/ライト付き・ドラッグ回転/ホイールズーム・`allMeshes` に追加したメッシュを HUD に一覧表示
- `coin.html` — 作業台ベースの猫エンブレムコイン・`createCoin()`・穴はコインを貫通・エンブレムは浮き彫り
- `tou.html` — 作業台ベースの塔・`createTou()`・3x3 グリッドの基壇（角は低く辺の中央は高い）+ 帯状の板 + 円筒 + 円錐屋根（12分割）・角の切り欠きに対角線上の両開き扉
- `treehouse.html` — 作業台ベースのツリーハウス・`createTreehouse()`・ローポリの木（六角柱の幹・地面に潜る根・正二十面体/正八面体の葉、半数ちょっと黄緑寄り）+ 真ん中で折れて別々の角度を向く2部屋（窓・扉・急勾配の赤屋根）+ 扉に立てかけたはしご
- `2dgrass.html` — 作業台ベースの板ポリ草・`create2DGrass()`・1房を6倍で中央に表示
- `2dgrass2.html` — 作業台ベースの板ポリ草その2・`create2DGrass2()`・1房を6倍で中央に表示
