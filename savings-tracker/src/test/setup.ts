import '@testing-library/jest-dom'

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
