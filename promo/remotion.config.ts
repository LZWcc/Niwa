// Remotion 的设置。渲染用本机的 Edge（无头），不另外下载 Chrome；不留打包缓存，省磁盘。
import path from 'node:path';
import { Config } from '@remotion/cli/config';

Config.setBrowserExecutable(process.env.EDGE_BIN ?? '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
Config.setChromeMode('chrome-for-testing');
Config.setCachingEnabled(false);
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setOverwriteOutput(true);
// 和 niwa 一样用 @/ 指向仓库根目录，直接用它的组件和样式（箱庭）；样式里的 /fonts/ 是扩展根目录下的，对应 public/fonts
const root = path.resolve(process.cwd(), '..');
Config.overrideWebpackConfig((config) => ({
  ...config,
  resolve: { ...config.resolve, alias: { ...config.resolve?.alias, '@': root, '/fonts': path.join(root, 'public/fonts') } },
}));
