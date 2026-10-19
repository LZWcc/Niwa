import { Composition } from 'remotion';
import Promo, { DURATION } from './Promo';

// 竖版 3:4（小红书）。横版以后再加一个 Composition。
export default function Root() {
  return <Composition id="Niwa" component={Promo} durationInFrames={DURATION} fps={30} width={1080} height={1440} />;
}
