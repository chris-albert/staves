import type { StavesDesktopAPI } from './index';

declare global {
  interface Window {
    staves?: StavesDesktopAPI;
  }
}
