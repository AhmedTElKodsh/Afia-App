/// <reference types="vite/client" />

// vConsole type declaration for TypeScript
interface VConsole {
  new (): any;
}

declare global {
  interface Window {
    vConsole?: any;
  }
}

export {};
