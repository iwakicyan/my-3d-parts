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
- `kanban.js` — 看板・`createKanban()`・原点=脚の間の中心・高さ1.2m・表(+z)に黒板、中央が前へ出る弓なり・`userData.footprint` 付き・`userData.board` が黒板のメッシュ（UV は正面に 0〜1。表示を貼る用）（形は workspace/kanban.html と同じ）
- `saku_1.js` — 柵・`createSaku1({spans})` / `createSaku1Corner({spansA, spansB})`・原点=端（角）の杭の根元・杭の高さ1.1m・間隔1.2m（`SAKU1.SPAN`）・横板2段が杭の真ん中を貫通・角はL字で横板が角で重なりはみ出しなし（形は workspace/saku.html と同じ）
- `kaidan_palace.js` — 階段の館・`createKaidanPalace()`・原点=底面の中心・+z が正面（低い側）・高さ3m×幅3.6m×奥行き4.7m・3段の板を重ねた階段形で下は空洞（背面が開く）・四隅に円筒の柱・輪郭線は階段状の角だけ・`userData.footprint` 付き（形は workspace/kaidan_palace.html と同じ）
- `easel.js` — イーゼル・`createEasel({image})`・原点=足元の中心・+z が正面・高さ1.7m・前の脚2本＋中央のマスト＋後ろの脚・棚に絵を貼ったキャンバスを立てかける（image で絵を差し替え、null でキャンバスなし。`userData.canvas` がキャンバスのメッシュ）・`userData.footprint` 付き（形は workspace/easel.html と同じ）
- `bridge01.js` — 橋・`createBridge01({cut, stepSink})`（水の上に架けるときは削る高さ・ステップを沈める量を水面より下に）・原点=地面の高さで橋の真ん中・円柱（軸=x）の両端に円錐を付けた形の上2mだけを出し、歩く向きは z（円柱のアーチを乗り越える）・アーチの縁に先端が正十二面体の棒・z の両端に高さ50cmのステップ・地面の下1mより下の面は削ってある・`userData.walkable` に上を歩けるメッシュ（本体とステップ）・`userData.footprint` 付き（形は workspace/bridge01.html と同じ）

## workspace（作業台）

- `index.html` — パーツ確認用の空の作業台・軸ポイント/地面/ライト付き・ドラッグ回転/ホイールズーム・`allMeshes` に追加したメッシュを HUD に一覧表示
- `coin.html` — 作業台ベースの猫エンブレムコイン・`createCoin()`・穴はコインを貫通・エンブレムは浮き彫り
- `tou.html` — 作業台ベースの塔・`createTou()`・3x3 グリッドの基壇（角は低く辺の中央は高い）+ 帯状の板 + 円筒 + 円錐屋根（12分割）・角の切り欠きに対角線上の両開き扉
- `treehouse.html` — 作業台ベースのツリーハウス・`createTreehouse()`・ローポリの木（六角柱の幹・地面に潜る根・正二十面体/正八面体の葉、半数ちょっと黄緑寄り）+ 真ん中で折れて別々の角度を向く2部屋（窓・扉・急勾配の赤屋根）+ 扉に立てかけたはしご
- `2dgrass.html` — 作業台ベースの板ポリ草・`create2DGrass()`・1房を6倍で中央に表示
- `2dgrass2.html` — 作業台ベースの板ポリ草その2・`create2DGrass2()`・1房を6倍で中央に表示
- `kanban.html` — 作業台ベースの看板・`createKanban()`・二本脚の板看板（実寸 高さ1.2m）を6倍で表示・弓なりの凸側(+z)が表で黒板・板の継ぎ目8本をメッシュの辺にしてそこで折り、中央が前(+z)へ出る弓なり（表裏の陰影は元の曲線から法線を作るので、継ぎ目の角は見えずなめらか）・黒い輪郭線付き
- `saku.html` — 作業台ベースの柵・`createSaku({spans})` / `createSakuCorner({spansA, spansB})`・細い角柱の杭（実寸 高さ1.1m・間隔1.2m）の真ん中を厚い横板2段が貫通し、杭の頭は上の板より上に出る・横板は端の杭からはみ出す・角は両側の横板が角の杭を貫通して重なり、外へのはみ出しは切り揃えたL字・3倍で直線と角を並べて表示・濃い紺の輪郭線付き
- `kaidan_palace.html` — 作業台ベースの階段の館・`createKaidanPalace()`・3段の階段の形の建物（実寸 高さ3m・幅3.6m・奥行き4.7m）を2倍で表示・段は厚い板を前から重ねた形で、下は空洞・背面が開き左右に壁・四隅に円筒の柱（角から少し内側・前2本は1段目の高さ、後ろ2本は最上段の高さ）・1段目の正面に小さな暗い両開き扉・コンクリート色・輪郭線は階段状の角（段を横切る線と側面の階段形）だけ
- `easel.html` — 作業台ベースのイーゼル・`createEasel()`・実寸 高さ1.7mを4倍で表示・前の脚2本を「ハ」の字に開き下半分は外へしなる・中央のマストは前の脚より上へ出て下は棚の下端で止まる・後ろの脚は上の横木の高さでマストの背面に当てて奥へ開く・上の横木は脚の間、下の横木はキャンバスを載せる棚で脚より外へはみ出す・棚に絵（PNG を data URI で内蔵）を貼った正方形のキャンバスを載せて上の横木に立てかける（`createEasel({image})`、null でキャンバスなし。絵は少し自発光）・木の色・黒い輪郭線付き
- `bridge01.html` — 作業台ベースの橋・`createBridge01()`・円柱（半径5m・長さ6m）の両端に円錐（長さ4.2m）を付けた形を横に寝かせ（軸=x。歩く向きは z）、地面から2mだけ出してほかは地面に埋める・地面の下1mより下に収まる面は削る・円柱/円錐とも16分割で平らな面が真上・原点=地面の高さで橋の真ん中・歩く向きは軸と直角（z）で円柱のアーチを乗り越える・円柱と円錐の境目（アーチ形の縁）の0.15m内側に沿って、四角柱の棒（間隔0.6m）を円柱の面に垂直に（x軸まわりだけ傾けて）地面に入るところまで並べ、先端に正十二面体を付ける・昇り降りするところ（z の両端）に高さ50cmのステップ（幅は柱の列より内側）・本体の色 #D6DBDA・フラットシェーディング・輪郭線は円柱と円錐の境目だけ
