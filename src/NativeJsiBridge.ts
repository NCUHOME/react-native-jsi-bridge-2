import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface JsiBridgeGlobal {
  registerCallback<T>(name: string, callback: (data: T) => void): void;
  removeCallback(name: string): void;
  emit(name: string, data?: unknown): void;
}

declare global {
  var __turboModuleProxy: object | undefined;
  var _JsiBridge: JsiBridgeGlobal | undefined;
}

export interface Spec extends TurboModule {
  getStatus(): Promise<string>;
}

export function initializeJsiBridge() {
  TurboModuleRegistry.getEnforcing<Spec>('JsiBridge');
}
