import { useCallback, useEffect, useRef, useState } from 'react';

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

  // Use useEffect (async) instead of useLayoutEffect (sync) to break
  // potential infinite render loops when observer fires during render.
  useEffect(() => {
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
      // Currently rendering — defer to after paint to break loops
      pendingRef.current = true;
      return;
    }
    setState([]);
  }, EMPTY_ARRAY);

  // Mark component as entering render cycle
  renderingRef.current = true;

  return scheduler;
}
