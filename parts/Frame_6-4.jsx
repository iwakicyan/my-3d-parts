/**
 * Frame_6-4.jsx
 * 6x4 ローポリフレーム構造
 * - 外周◻︎ 縦柱: x・z ±2, 間隔1
 * - 横梁: y=1〜6, 外周4辺
 * - 全方向間隔1統一
 * Standard: flatShading, castShadow, THREE.Group, height ~6.0 units
 * 作りは Frame.jsx と同じ（halfSize=2, height=6）。角材を 1 メッシュに結合して描く
 */

import { createFrame } from './Frame.jsx';

export const createFrame64 = () => createFrame(2, 6);
