import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement matchMedia — every real browser does, but RTL
// renders into jsdom, not a browser. Stubbed as "nothing matches" (i.e.
// prefers-reduced-motion: reduce is NOT active), which is the correct
// default for a test environment: RTL tests exercise the app's actual
// (non-reduced) behavior, while e2e/accessibility.spec.ts's dedicated
// reduced-motion test covers that preference for real in a real browser.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
