import { useCallback, useRef, useState } from 'react';

import { useLayoutEffect } from './useLayoutEffect';

const EMPTY_ARRAY: any[] = [];

export function useForceUpdate() {
  const [, setState] = useState([]);
  const firstRenderedRef = useRef(false);
  const needUpdateRef = useRef(false);
  const renderingRef = useRef(false);
  const pendingRef = useRef(false);

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

  // Defer observer updates fired during render until the current commit finishes.
  useLayoutEffect(() => {
    renderingRef.current = false;
    if (pendingRef.current) {
      pendingRef.current = false;
      setState([]);
    }
  });

  const scheduler = useCallback(() => {
    if (!firstRenderedRef.current) {
      needUpdateRef.current = true;
      return;
    }
    if (renderingRef.current) {
      pendingRef.current = true;
      return;
    }
    setState([]);
  }, EMPTY_ARRAY);

  renderingRef.current = true;

  return scheduler;
}
