# Niwa

使用 WXT + React + TypeScript 开发的轻量浏览器新标签页：左上角时间与节气，正中搜索框，下面是快捷方式和小组件自由摆放的网格，背景是随季节、时辰变化的山水（深色时是月夜）。右上角可以切换浅色 / 深色（日落月升的过渡，默认跟随系统），也可以把全部数据导出成备份，在另一个浏览器里导入。

## 开发

```sh
pnpm install
pnpm dev -b edge
```

在自动打开的开发浏览器中按 `⌘T`（Windows/Linux 使用 `Ctrl+T`）查看新标签页；如果浏览器询问是否保留新标签页更改，选择保留。保存源码后 WXT 会热更新或重载扩展。

本机浏览器路径在 `web-ext.config.ts` 中配置，该文件被 Git 忽略。`pnpm dev` 默认编译 Chrome 目标，`pnpm dev -b edge` 编译 Edge 目标。

提交前运行：

```sh
pnpm check   # 类型检查 + ESLint + Prettier 格式检查
pnpm test    # 布局算法单元测试 + 页面测试
```

`pnpm format` 按 Prettier 格式化全部文件。

## 目录结构

按 WXT 的约定分 `entrypoints/`、`components/`、`hooks/`、`utils/`，组件再按功能分子目录。

```
config.ts                  可以按需调整的配置：搜索引擎、默认快捷方式、图标服务、日程与天气参数、配色
entrypoints/newtab/        新标签页入口
  App.tsx                  页面骨架：景、时间、搜索、网格
  main.tsx                 挂载；首帧前写好季节与时辰
  styles/                  样式，index.css 按顺序引入各部分（后面的可以覆盖前面的）
    tokens / base / dialog / utilities.css   全局：变量、基础、对话框、工具类
    page/  search/  grid/  widgets/          和 components/ 对应
components/
  common/                  Popover（挂在 body 上、按视口定位的弹出层）、Dialog（原生 <dialog> 的模态对话框）、ErrorBoundary
  page/                    Scene（背景的景）、Clock（时间、日期、节气）、ThemeToggle（浅色 / 深色）、BackupButton（备份与恢复）
  search/                  Search（搜索框与搜索引擎菜单）、Suggestions（收藏和浏览记录的联想）
  grid/                    网格：Grid（组装）、AddTile、Shortcut、ShortcutIcon、ShortcutDialog、IconPicker（选图标）
  widgets/                 小组件
    index.ts               每种小组件对应哪个组件（注册表）
    types.ts               小组件的参数约定（WidgetProps、FrameProps）
    WidgetFrame.tsx        共用外框：卡片、“…”菜单（尺寸、额外项、移除）
    WidgetHeader.tsx       共用标题栏：标题、元信息、右侧工具（见「小组件的卡片」）
    WidgetError.tsx        小组件出错时顶替它的卡片
    LinkRow.tsx、LinksSearch.tsx、AccessPrompt.tsx   收藏夹、历史共用：一行网站链接、搜索、申请权限的提示
    notes/  calendar/  garden/  bookmarks/  history/  weather/
hooks/
  grid/
    useGrid.ts             网格数据：增删改，存 niwa:grid；快捷方式的图标图片存 niwa:icons
    useGridLayout.ts       摆放：列数、每一格在哪（含「添加」）、新格子放哪、改尺寸怎么让
    useGridDrag.ts         拖动交互：指针、吸附、占位框、自动滚动、Esc 取消
    useFlip.ts             布局动画：改数据前后各格从旧位置弹到新位置
  useCalendar.ts           日程数据与缓存
  useBookmarks.ts          收藏夹树，浏览器里改了收藏时重新读
  useBrowsingHistory.ts    历史：最近、常去、最近关闭
  useSuggestions.ts        搜索框的联想：在收藏夹和浏览记录里找
  useWeather.ts            天气数据与缓存
  usePermissions.ts        可选权限（收藏夹、历史）是否已有、点击申请
  useStored.ts             存在 localStorage 里的数据（useStored、useStoredList），多个标签页之间同步
  useSiteIcons.ts          输入网址后自动获取网站图标
  useTheme.ts              浅色 / 深色：跟随系统或固定一种，写到 <html data-theme>
  useMinute.ts、useVisits.ts
utils/                     不依赖 React 的纯函数和数据
  grid/
    items.ts               网格里每一项的类型、校验和默认项
    layout.ts              网格摆放规则（拖放、往下推、找空位），单元测试覆盖
    dom.ts                 网格在页面上的查询（格子、排版位置）
    links.ts               快捷方式的网址补全与默认名称
  icons/
    model.ts               图标的类型（图片 / 文字）、文字图标的默认样子、niwa:icons 的校验
    fetch.ts               自动获取网站图标：网站自己声明的优先，Google 图标服务兜底
    image.ts               图片统一成 128px 的方形 webp
  calendar/
    ical.ts                读 iCal：下载、解析、展开重复日程
    format.ts              日程的时间、日期、地点怎么显示
  storage.ts               所有 localStorage 键、JSON 读写与校验
  backup.ts                备份与恢复：导出、校验、整体替换（见「备份与恢复」）
  permissions.ts           按需申请的权限：访问网站（日历、获取图标）、读取浏览器数据（收藏夹、历史）
  browsing.ts              收藏夹与历史：只显示网页、时间写法、收藏夹的路径与搜索
  weather.ts               天气：搜城市、取实况与预报（和风天气）、图标代码对应的图标与背景
  errors.ts                错误处理：AppError、toUserMessage、reportError（见「错误处理」）
  widgets.ts               小组件目录：种类、名称、默认尺寸、尺寸占几格
  date.ts                  日期基础：DAY、星期、补零、当天 0 点、日期键
  almanac.ts               节气、七十二候、季节与时辰
  theme.ts                 浅色 / 深色的选择，以及切换时的日落月升（switchTheme）
  spring.ts                弹簧动画曲线
  notes.ts、visits.ts、preview.ts
tests/                     见下文「测试」
public/fonts/              时钟字体子集（Zen Kaku Gothic New，OFL）
```

各层的分工：`utils/` 只放纯函数和数据，不碰 React；`hooks/` 管状态和副作用；`components/` 只负责画出来，尽量不含规则。新代码按这个分工放。

## 搜索

搜索框是原生表单提交（GET 到 `config.ts` 里搜索引擎的地址），页面任意处按 `/` 聚焦。

输入时在收藏夹和浏览记录里找，列在搜索框下面（`useSuggestions`，只读本地数据，不联网）：收藏排在前面（最多一半），浏览记录按访问次数排，同一个网址只留一条，最多 6 条。↓↑ 选择（走过两头回到输入框），回车打开选中的，⌘ / Ctrl + 回车在新标签页打开；没选中时回车照常搜索。Esc 只收起联想、不清空输入框。读取用的是收藏夹、历史小组件申请过的权限；都没有时联想里问一次「允许 / 不用了」。

引擎菜单（搜索框左边）里可以关掉联想（`niwa:search-suggest`，「不用了」也是关掉它），以及管理**排除的网站**（`niwa:search-exclude`）：排除按域名、含子域名，只影响联想，不动浏览器的收藏和历史；在联想里悬停一条、点右侧的 × 也能排除它所在的网站。排除列表本身会暴露不想被看到的网站，所以算私密信息（见「备份与恢复」）。

## 网格

网站快捷方式和小组件存在同一个列表里（`niwa:grid`），每一项记自己左上角的列 x、行 y，可以留空、竖着叠。网格单位 80px、间距 20px，最多 12 列（1180px，搜索框固定 716px）；快捷方式 1×1（图标 58px），小组件小 2×2、中 4×2、大 4×4。

数据流：`useGrid`（存什么）→ `useGridLayout`（结合当前列数算出每一格在哪）→ `Grid` 画出来；拖动由 `useGridDrag` 处理，增删、改尺寸、拖动都经过 `useFlip` 的 `animate`，其余格子会滑到新位置。

- 「添加」也是一个能拖的格子，位置存在 `niwa:add`，第一次打开时放在最后一格后面。新加的格子：「添加」排在最后时占它的位置、它往后挪一格；否则接在最后一格后面，不填前面留的空。
- 没有位置的项（第一次打开时的默认项）按顺序补进空位并保存；窗口变窄、某一格超出列数时临时挪到空位里，不改保存的位置。
- 页面打开期间不移动 DOM 节点，位置全靠 `grid-column` / `grid-row`（移动节点会让毛玻璃重建合成层、闪一下）。

拖放规则在 `utils/grid/layout.ts`，参照 react-grid-layout / gridstack 和手机桌面，只有四条（`moveItem`）：

1. 拖到空位：直接放下；
2. 压到同尺寸的（压住一半以上）：两块互换；大的压到几个小的：这几个保持相互位置整组搬进它腾出来的地方；
3. 搬不进去时：小的竖直往下推，下面碰到的也依次往下推，从不横向绕行（`pushDown`，改尺寸变大也用它）；
4. 小的压到大的：不接受，留在上一个有效位置。

拖动时从上一次判断到的格子一格一格走到当前格子（`stepDrag`），先让开路上的小图标，再碰到后面的组件；互换和整组搬移会累积，拖过一排图标时每个只挪一格。交互细节在 `hooks/grid/useGridDrag.ts` 开头：按住移动超过 4px 才算拖动，落点是被拖那块左上角吸附到的格子（挪过半格就到下一格），指针移动很快时先不定落点，拖动期间列数锁定，按 Esc 恢复。

## 小组件

- **便签**（`widgets/notes/`）：回车保存，点一条复制；焦点不在输入框时在页面任意处粘贴会直接存成一条（`niwa:notes`）。
- **日程**（`widgets/calendar/`）：粘贴 Google 日历的「iCal 格式的私密地址」（或任意 .ics 订阅地址），只读、无需登录，可以连接多个日历。`CalendarWidget` 负责数据、菜单和两个对话框；`CalendarAgenda` 列出接下来 7 天，按实际高度放得下几条显示几条，不出滚动条；`CalendarMonth` 是月历；`EventDetail` 是详情；`CalendarDialog` 管理日历。数据先显示本地缓存，超过 15 分钟（失败后 2 分钟）在后台刷新；ical.js 按需加载；访问日历网站的权限在添加时按需申请（`optional_host_permissions`）。
- **庭**（`widgets/garden/`）：一只等距视角的箱庭，按累计打开天数生长（`MILESTONES`）：第 1 天一块石，第 3 天第二块，第 5 天起有四季落物，第 7 天长苔，第 14 天一棵随季节换装的树，第 21 天一块小石，第 30 天一盏夜里会亮的石灯笼。天数只计累计不计连续（`niwa:garden`）。

- **收藏夹**（`widgets/bookmarks/`）：在卡片里按文件夹浏览浏览器的收藏，从收藏夹栏开始，记住上次看到的文件夹（`niwa:bookmark-folder`）；中、大尺寸点标题栏的放大镜可以搜索全部收藏。浏览器里增删改收藏时立即更新。
- **历史**（`widgets/history/`）：「最近」是浏览记录（每个网址一条），「常去」和浏览器自带新标签页的常去网站是同一份数据（`topSites`），大尺寸多一组「最近关闭」，点了恢复那个标签页或窗口。每分钟和回到这个标签页时重新读，记住选的是哪一组（`niwa:history-tab`）。中、大尺寸点放大镜可以搜索全部浏览记录。
- 收藏夹和历史都只显示 http(s) 网页（`chrome://`、`javascript:` 从新标签页点不开），没有标题的显示域名；是普通链接，⌘ / Ctrl 点击在新标签页打开；网站图标用浏览器本地缓存的 `_favicon`，不联网。权限在 manifest 的 `optional_permissions` 里，安装时不提示，添加小组件后点一下才申请（最近关闭的网址和标题要 `tabs` 权限）。

- **天气**（`widgets/weather/`）：数据来自和风天气：国内的地名到区县、实况来自气象站观测（换掉了 Open-Meteo：它的中文地名缺漏、排序错，长沙、厦门都搜不对，国内预报也不稳）。用户在「天气设置」里填自己的免费 API KEY 和账号专属的 API Host（存在 `niwa:weather-account`，是私密信息，见「备份与恢复」），保存前先试搜一次确认填对；再按名称搜城市（区县写上市和省），选定的存在 `niwa:weather-city`。和风允许跨域，不用申请访问网站的权限；KEY 放在请求头 `X-QW-Api-Key` 里，接口路径在 `config.ts` 的 `WEATHER.api`（v7：按 LocationID 查实况、24 小时、7 天）。和风从 2027 年起会限制用 API KEY 认证的每日请求量，到时如果不够用，改成 JWT 认证。先显示本地缓存，超过 30 分钟（失败后 5 分钟）在后台刷新；失败时保留上一次的数据，标题栏显示「更新失败」，悬停看原因。小尺寸是现在的温度与天气，中尺寸加接下来 5 小时，大尺寸再加体感、湿度、风和接下来 5 天。钟点和星期按城市当地时间写。图标是自己画的 SVG（`WeatherIcon`），颜色是 `--w-*` 变量。
  - **背景跟随天气**（可选，菜单里的开关，存在 `niwa:scene-weather`，默认关）：阴、雾、雨、雪时背景跟着变——阴天天色压暗、日月躲到云后，雾里远山被吞掉，雨丝和雪点在整窗的一层里落下。天气小组件在绘制前把当前天气写到 `<html data-weather>`（`applySceneWeather`），样式只看这个属性（`page/scene.css`）；晴、少云不写，小组件移除、开关关掉、数据旧过 3 小时（`WEATHER.sceneMaxAge`）时也不写。雨雪只用 `transform` 循环下落，减少动态效果时停住。不进备份（和收藏夹看到哪个文件夹一样，是小组件自己的显示偏好）。

### 小组件的卡片

所有小组件长得一样，新的小组件照着做：

- **标题栏**：最上面用 `WidgetHeader`，左边是标题和一行灰色的元信息（「2 条」「今天 2 项」「第 16 日」、收藏夹所在的文件夹），右边放切换、搜索这类工具（`children`）。右侧自动留出“…”按钮的位置。小尺寸也有标题栏。
- **画面型的内容放进内嵌面板**：庭的砂盘、日程的日期这类以画面为主的，包在 `.widget-panel` 里，加 `is-dotted` 是点阵底纹（颜色是 `--panel`、`--panel-dot`）；像一扇小窗，和列表区分开。列表型的内容（便签、收藏夹、历史）不加面板，保持轻。

### 新增一种小组件

1. 在 `utils/widgets.ts` 的 `WidgetType` 和 `WIDGETS` 里登记名称、说明、默认尺寸。
2. 在 `components/widgets/<名字>/` 写组件，参数是 `WidgetProps`（`widget`、`frame`、`now`），内容用 `WidgetFrame` 包起来，最上面是 `WidgetHeader`；要在“…”菜单里加项就传 `menu`。
3. 在 `components/widgets/index.ts` 的 `WIDGET_COMPONENTS` 里对上组件。
4. 要存数据就在 `utils/storage.ts` 的 `KEYS` 里加一个键，用 `useStoredList` 或 `readJson` / `writeJson` 读写。
5. 样式加到 `entrypoints/newtab/styles/widgets/`，新文件记得在 `index.css` 里引入。

「添加」菜单会自动列出新的小组件。

## 代码约定

- 注释和界面文字用中文；注释写“为什么这样做”，显而易见的不写。
- 组件文件用 PascalCase，一个文件一个默认导出的组件；hooks 以 `use` 开头；`utils/` 用具名导出。
- 摆放规则这类不依赖页面的逻辑写成 `utils/` 里的纯函数，并在 `tests/unit/` 里补测试。
- 本地数据的键一律在 `utils/storage.ts` 的 `KEYS` 里登记；字符串直接用 `localStorage.getItem / setItem`，JSON 用 `readJson`（带校验）/ `writeJson`。
- 新代码按功能放进对应子目录（`grid/`、`calendar/` 等），和 `components/` 的分法保持一致；多处共用的基础量（如 `DAY`、星期）放在 `utils/date.ts`，不在各文件里重复定义。
- 一行就能写完、又只在一处用到的，直接写在用的地方，不单独包成函数。
- 换个值就行、不用改逻辑的放进根目录的 `config.ts`：依赖外部世界、会过时的（第三方服务的地址、别的网站的链接格式），内容和偏好（默认项、可选项、配色），调节参数（超时、刷新间隔）。和 CSS、交互手感绑在一起的（网格尺寸、拖动阈值、动画时长）、本身就是作品或事实的（庭的画法、节气表）、本身就是结构的（存储键、备份版本、小组件注册表）留在代码旁边。`config.ts` 只放数据，怎么用这些数据写在用的地方。
- 不为不会发生的情况加兜底（多余的 `try/catch`、`?.`、`?? 默认值`、判断浏览器是否支持某个 API）。只校验真正来自外部的数据：localStorage 里存的、iCal 下载的、用户输入的。出错了怎么办见「错误处理」。
- 打开新标签页本身从不联网：不加远程字体、远程图片；优先使用 CSS、浏览器原生 API 和 React 自带能力，按实际需求增加依赖。只在用户主动操作时联网：添加的日程、选了城市的天气（之后都在后台定时刷新）、添加快捷方式时获取网站图标（取到就存在本地，之后不再联网）。访问网站的权限都在用的时候才申请。
- 深色样式写在 `:where([data-theme='dark'])` 下，不用 `prefers-color-scheme`（是否深色由 `utils/theme.ts` 决定）。
- `useEffect` 的依赖确实需要省略时，用 `eslint-disable-next-line` 并在上一行写明原因。

开发模式下可以在新标签页地址后加 `?days=30&season=winter&phase=night&weather=rain` 预览庭和季节、时辰、背景的天气（cloudy、fog、drizzle、rain、snow）（`utils/preview.ts`）；正式构建会忽略这些参数。

## 快捷方式的图标

每个快捷方式记 `icon`：图片，或文字图标（一两个字 + 背景色）。没有 `icon` 的（默认项、更早添加的）用浏览器本地缓存的网站图标（`_favicon`），取不到时显示首字母。

- **自动获取**（`utils/icons/fetch.ts`）：输入网址后同时从几个来源取，取到的都列成候选，先回来的先显示：
  - 网站自己声明的图标（`apple-touch-icon`、`<link rel="icon">`、manifest 里的 icons）排在最前、默认选中：最清晰，也不经过第三方。但不少网站（B 站、知乎等）的首页是反爬页，读不到。
  - 第三方图标服务配置在 `config.ts` 的 `ICONS.sources` 里，按优先级排：icon.horse、Google、favicone。加、删、调顺序只改这个数组。它们会知道你添加了哪个域名；免费服务可能限流、停掉，或在某些网络下连不上（国内直连时 Google 不通），所以配了几个，互不影响。
  - 查不到时，有的服务会返回一张生成的占位图，而不是报错：按各自配置的 `placeholder` 识别后丢掉。favicone 的占位图对所有域名都一样，按内容比对；icon.horse 只能靠缓存时间特别短来判断，服务变了要跟着改。
  - 原图小于 48px 的太糊，不要；都没有时默认用文字图标。
- **权限**：获取图标要访问任意网站（manifest 里可选的 `https://*/*`）。浏览器只允许在点击里申请，所以第一次要点「自动获取网站图标」，之后输入网址就自动获取。
- **图片怎么存**：都统一成 128px 的方形 webp data URL（`image.ts`；只是个标志的放在白底上留边），每张几 KB。图片单独存在 `niwa:icons`（快捷方式 id → 图片），快捷方式上只记 `{ kind: 'image' }`：拖动时每挪一格都会重写 `niwa:grid`，图片放进去会拖慢它。删除快捷方式或换成文字图标时，图片一起删掉。
- 用 localStorage 而不是 IndexedDB：同步读取，第一帧图标就在，不会先闪首字母。图标多到接近容量（约 5MB）时再换。

## 备份与恢复

右上角的按钮导出一个 JSON 文件（`utils/backup.ts`），在另一个浏览器里导入：

```json
{
  "app": "niwa",
  "version": 4,
  "exportedAt": "…",
  "data": { "grid": [], "addTile": {}, "icons": {}, "notes": [], "visits": {}, "engine": "Bing", "theme": "system", "weather": null }
}
```

- 包含布局（每一格的位置、链接、图标）、图标图片、便签、庭的天数、搜索引擎、浅色 / 深色和天气的城市（第 2 版起；导入第 1 版的备份时当作没有选城市）。日程和天气的缓存可以重新获取，不导出。
- **私密信息相当于密码**（日历订阅地址、天气 KEY、联想排除的网站），统一登记在 `backup.ts` 的 `SECRETS`：默认不导出，勾选「包含私密信息」后才带上（`data.secrets`，这边没有的项不带）。导入时备份里有哪项就替换哪项，没有的保留这边原来的。以后新加的私密数据（KEY、令牌、私密地址）也登记在这里，不要单独处理。
- **导入是整体替换**，不和现有数据合并；写完重新加载页面。文件先整体校验（每一项的格式、id 不重复、同一种小组件只有一个、图片图标都有图片），有一处不对就整个拒绝，不只导入一部分。
- **改了 `BackupData` 的结构就把 `VERSION` 加一**，并在 `parseBackup` 里把旧版本的备份迁移过来；比当前版本还新的备份会提示先更新。

## 错误处理

约定都在 `utils/errors.ts`，分三类：

| 哪种错误                       | 例子                                          | 怎么做                                                               |
| ------------------------------ | --------------------------------------------- | -------------------------------------------------------------------- |
| 预料之中、用户能看懂的失败     | 连不上日历网站、地址 404、不是 .ics、权限被拒 | 在出错的地方 `throw new AppError('给用户看的话', { cause })`         |
| 外部数据不对，但有合理的默认值 | localStorage 里的数据被改坏、网址输入无效     | 校验后返回 `null` 或用默认值（`readJson`、`normalizeUrl`），不算错误 |
| 意料之外的错误（bug）          | 代码写错、库抛出的异常                        | 不 catch，让它往上冒                                                 |

- **只在能给用户反馈的地方 catch**：对话框里的提示、小组件的状态栏。用 `toUserMessage(error, 在做什么)` 转成一句话：`AppError` 显示它的 message；其余显示“出了点问题”，同时记录下来，不会被吞掉。没有反馈可给的地方不写 catch。
- **全局兜底只有两处**：组件渲染出错由 `ErrorBoundary` 接住，每个小组件单独一个（出错的只有这一格换成 `WidgetError`，还能重试或移除），整页外面再包一个；事件处理里抛的错误和没人处理的 Promise 失败，由 `main.tsx` 里的 `error` / `unhandledrejection` 监听接住。
- **记录只有一个出口**：`reportError`。现在只打到控制台（新标签页不联网）；以后要存日志或上报，只改这一个函数。
- 多个互不相关的请求用 `Promise.allSettled`，一个失败不影响其他的（例如多个日历）。

## 打包

```sh
pnpm exec wxt build -b edge
```

Edge 构建输出位于 `.output/edge-mv3/`。可以在日常浏览器的 `edge://extensions` 中开启开发人员模式，通过“加载解压缩的扩展”选择该目录。不要直接修改 `.output/` 或 `.wxt/`，它们是生成目录。

## 测试

```sh
pnpm test        # 两种都跑
pnpm test:unit   # 布局算法（utils/grid/layout.ts），只要 Node，不开浏览器
pnpm test:e2e    # 先构建，再用无头 Edge 跑页面测试
```

- `tests/unit/layout.test.mjs`：拖放规则的单元测试，用字母画出网格，每条写明期望的摆放。改 `utils/grid/layout.ts` 时先跑它。
- `tests/e2e/`：页面测试。`run.mjs` 起一个本地服务器（扩展文件来自 `.output/edge-mv3/`，测试页来自 `tests/e2e/`，测试日历由 `fixtures.mjs` 按今天生成），用独立的临时配置目录打开无头 Edge，汇总每个测试页输出的 PASS / FAIL；有失败或没跑完时退出码非 0。Edge 不在默认位置时用 `EDGE_BIN` 指定。
  - `main.test.html`：搜索、便签、小组件、日程与月历、快捷方式增删改、拖动摆放、刷新后保持。无头模式的虚拟时间里动画不会推进，所以这一页在“减少动态效果”下运行。
  - `calendars.test.html`：多个日历的添加、去重、命名与合并显示，日历失败时显示的原因。
  - `icons.test.html`：自动获取网站图标（`run.mjs` 提供一个声明了图标的假网站；第三方图标服务的请求在测试页里转到假响应，不依赖外网）、找不到时用文字图标、上传图片、图片的保存与删除。
  - `backup.test.html`：导出的内容、私密信息默认不导出、坏文件整个拒绝、旧版本的迁移、导入后整体替换。
  - `weather.test.html`：天气。和风天气的请求在测试页里转到假数据：填 KEY（填错时的提示）、搜城市、各尺寸显示的内容、缓存、更新失败时保留数据、背景跟随天气的开关。
  - `browsing.test.html`：收藏夹与历史，以及搜索框的联想（排序、去重、键盘选择、排除网站、开关）。测试页不在扩展里，把 `chrome.bookmarks` 等接口换成假的：文件夹进出与记忆、只列网页、长标题不溢出、新收藏出现、搜索、最近 / 常去 / 最近关闭与恢复。
  - 无头模式用的是虚拟时间：页面空闲时会直接快进，不等读文件、解码图片这类真实的异步操作。要等它们时用测试页里的 `waitFor`（等待期间一直请求 `run.mjs` 的 `/__tick`，请求挂起时虚拟时间会暂停）。
- 拖拽的手感、深色模式、真实网站的图标、访问网站的授权弹窗这些测不到，改动后在浏览器里手动过一遍。
