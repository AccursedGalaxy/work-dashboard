export {};

declare global {
  interface Window {
    DASHBOARD_DEFAULT_CONFIG?: any;
    DASHBOARD_CONFIG?: any;
    __openQuickLauncher?: () => void;
    __closeQuickLauncher?: () => void;
  }
}


