import { createContext, useContext } from 'react';

/**
 * 小组件库里的预览：真组件放在 SampleContext 里画，数据钩子改用 utils/sample.ts 的演示数据——
 * 不联网、不读浏览器的收藏和历史、不查也不申请权限、不写存储。只用在预览里，页面上的小组件都是 false。
 */
export const SampleContext = createContext(false);
export const useSample = () => useContext(SampleContext);
