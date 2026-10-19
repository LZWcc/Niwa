import { Composition } from 'remotion';
import Cards, { PAGE_COUNT } from './Cards';
import Promo, { DURATION } from './Promo';

// 竖版 3:4（小红书）：宣传片，和一组图文（一帧一张图）。横版以后再加一个 Composition。
export default function Root() {
  return (
    <>
      <Composition id="Niwa" component={Promo} durationInFrames={DURATION} fps={30} width={1080} height={1440} />
      <Composition
        id="NiwaWide"
        component={Promo}
        defaultProps={{ wide: true }}
        durationInFrames={DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition id="Xhs" component={Cards} durationInFrames={PAGE_COUNT} fps={30} width={1080} height={1440} />
    </>
  );
}
