# 浏览器兼容修复实验（2026-11-14）

实验仓库：`victory200707/xixingshenzhou`。原始来源：
`victory200707/xixing-shenzhou-map@5360ccbad342d9775157cd372a6356218da84aea`。
原仓库不作任何修改；复制原有的全部 248 个文件，再单独提交实验修复。

## 已确认问题

1. `src/astronomy/solar-field.js` 在浏览器内栅格化 SVG、再提取填充蒙版。
   Chromium/Firefox 与 WebKit 的输出不同，WebKit 出现只有界线、缺少地形着色的情况。
   同时，SVG 图片加载成功但填充验证失败时，回退蒙版仍然使用原图坐标，
   部分消费者却把它当成显示区域坐标，产生明显拉伸；晨昏线还有一次重复缩放。
2. 地形图片异步回调向着色函数传入 `null` 日期，触发
   `Cannot read properties of null (reading 'getTime')`。
   加载期间改变视口或滚动还会使旧矩形坐标参与画布定位。
3. `src/css/style.css` 的桌面最小宽度与 820px 移动断点之间存在缺口，
   `overflow:hidden` 又使较小窗口中的内容无法访问；手机标题和时间会挤压。
4. `.time-range` 的绝对定位缺少局部定位父级，透明滑块的点击区域偏离轨道。
5. 源仓库缺少 `vendor/sunrise-sunset-js/dist/index.js`，被 `.gitignore` 的
   `dist/` 规则排除，而主入口静态导入它，干净副本无法启动。
   注意：检查时原 GitHub Pages 部署能返回该脚本，其 SHA-256 与归档一致。
   因此不能把“线上始终缺文件”或“Edge 缓存”当作已经证实的原因。
6. `tools/local_server.js` 使用 CommonJS `require`，与包声明的 ES module 冲突。

## 修复

- 将既有 `createLineworkFillMask` 算法在 Chromium 中的结果保存为
  `assets/map/raster/browser-land-mask.png`，三个引擎使用相同的栅格。
  生成脚本、输入和输出 SHA-256 记录在 `browser-land-mask.json` 中。
  这是原有显示蒙版的缓存；没有新增地理数据或修改官方 SVG、边界或岛屿几何。
- 统一蒙版到显示坐标，取消重复变换；画布固定于共同父容器原点，
  异步重绘读取当前容器尺寸；空日期使用上次有效日期。
- 在宽度不超过 1024px 或高度不足 700px 时采用可滚动布局，修复手机标题、
  地图缩放和轨道宽度；滑块采用局部绝对定位并清除默认 margin。
- 从已有的 3.3.1 归档恢复同一份审计脚本，增加精确 `.gitignore` 例外。
- 本地服务器改为 ES module；部署前运行静态发布检查，防止依赖再次遗漏。

## 验证结果

Windows 上使用 Playwright 的 Chromium 151、Firefox 153 和 WebKit 26.5 引擎，
分别检查 1440×900、900×768、390×844、320×720，共 12 个组合：

- 页面模块及资源加载成功，无未捕获脚本错误；14 个城市标记存在。
- 北京夏至日出显示 04:46；双城对比、天文阶段、冬至切换和时间轴键盘操作正常。
- 文档宽度等于视口宽度，无横向溢出；画布原点与地图容器一致，滑块与轨道对齐。
- 三种引擎在四个尺寸下着色蒙版的纵向像素范围一致，修复前 WebKit 输出不一致。
- 已检查 Chromium、Firefox、WebKit 的截图；静态模块图、天文脚本与蒙版来源哈希测试通过。

这是自动化引擎测试，不代表已经覆盖每一个实际浏览器版本、iPhone 或 Android 真机。
WebKit 引擎测试也不等同于在 macOS/iOS Safari 真机验收。
字体使用系统回退，系统之间仍可能有正常的字形差异。
测试没有证明 Chrome 或 Firefox 在所有环境下都不能打开原站。

本地启动：`npm start`，然后访问 `http://127.0.0.1:8766/`。
发布检查：`npm run test:release`。
如需重新生成显示蒙版，安装 Playwright 并执行 `node tools/generate-browser-mask.mjs`；
脚本必须在实验仓库根目录运行，生成后核对来源哈希并重新进行视觉验证。
