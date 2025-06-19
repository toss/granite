import { createRoute, Lottie } from '@granite-js/react-native';
import { ScrollView } from 'react-native';

export const Route = createRoute('/showcase/lottie', {
  validateParams: (params) => params,
  component: ShowcaseLottie,
});

function ShowcaseLottie() {
  return (
    <ScrollView stickyHeaderIndices={[0]}>
      <Lottie.AnimationObject
        height={100}
        animationObject={LOTTIE_DATA}
        autoPlay={true}
        loop={true}
        onAnimationFailure={() => {
          console.log('Animation Failed');
        }}
        onAnimationFinish={() => {
          console.log('Animation Finished');
        }}
      />
    </ScrollView>
  );
}

const LOTTIE_DATA = {
  v: '5.5.7',
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  nm: 'dots loading',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'dot',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: {
          a: 1,
          k: [
            { t: 0, s: [30, 50, 0], e: [70, 50, 0], i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } },
            { t: 30, s: [70, 50, 0], e: [30, 50, 0], i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } },
            { t: 60 },
          ],
        },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      shapes: [
        {
          ty: 'el',
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [20, 20] },
          nm: 'Ellipse Path',
        },
        {
          ty: 'fl',
          c: { a: 0, k: [0.2, 0.6, 1, 1] },
          o: { a: 0, k: 100 },
          nm: 'Fill',
        },
        {
          ty: 'tr',
          p: { a: 0, k: [0, 0] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] },
          r: { a: 0, k: 0 },
          o: { a: 0, k: 100 },
          sk: { a: 0, k: 0 },
          sa: { a: 0, k: 0 },
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0,
    },
  ],
};
