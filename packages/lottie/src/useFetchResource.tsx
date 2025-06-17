import LottieView from '@granite-js/native/lottie-react-native';
import { useEffect, useState, type ComponentProps } from 'react';

export function useFetchResource(src: string, onError?: ComponentProps<typeof LottieView>['onAnimationFailure']) {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function run() {
      const response = await fetch(src);
      setData(await response.json());
    }

    run().catch(
      onError ??
        ((e) => {
          throw e;
        })
    );
  }, [src, onError]);

  return data;
}
