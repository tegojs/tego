import { useCallback, useRef, useState } from 'react';

import { useLayoutEffect } from './useLayoutEffect';

const EMPTY_ARRAY: any[] = [];

export function useForceUpdate() {
  const [, setState] = useState([]);
  const firstRenderedRef = useRef(false);
  const needUpdateRef = useRef(false);
  useLayoutEffect(() => {
    firstRenderedRef.current = true;
    if (needUpdateRef.current) {
      setState([]);
      needUpdateRef.current = false;
    }
    return () => {
      firstRenderedRef.current = false;
    };
  }, EMPTY_ARRAY);

  const scheduler = useCallback(() => {
    if (!firstRenderedRef.current) {
      // During first render cycle — defer the update until layout effect fires
      needUpdateRef.current = true;
      return;
    }
    setState([]);
  }, EMPTY_ARRAY);

  return scheduler;
}
