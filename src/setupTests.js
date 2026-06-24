// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

const createMatchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: createMatchMedia,
});
global.matchMedia = window.matchMedia;

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

if (typeof window.MessageChannel === 'undefined') {
  class MessageChannelMock {
    constructor() {
      this.port1 = {
        onmessage: null,
        close: () => {},
        postMessage: () => {},
        start: () => {},
      };
      this.port2 = {
        close: () => {},
        start: () => {},
        postMessage: (message) => {
          setTimeout(() => {
            this.port1.onmessage?.({ data: message });
          }, 0);
        },
      };
    }
  }

  window.MessageChannel = MessageChannelMock;
  global.MessageChannel = MessageChannelMock;
}
