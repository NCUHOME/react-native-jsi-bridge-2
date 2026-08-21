import { NativeModules, Platform } from 'react-native';
import { initializeJsiBridge, type JsiBridgeGlobal } from './NativeJsiBridge';

const LINKING_ERROR =
  `The package 'react-native-jsi-bridge-2' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo managed workflow\n';

const _JsiBridge = NativeModules.JsiBridge
  ? NativeModules.JsiBridge
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

if (globalThis.__turboModuleProxy != null) {
  initializeJsiBridge();
} else {
  _JsiBridge.install();
}

function getJsiBridge(): JsiBridgeGlobal {
  const bridge = globalThis._JsiBridge;
  if (!bridge) {
    throw new Error(LINKING_ERROR);
  }
  return bridge;
}

export class JsiBridge {
  static on<T>(name: string, callback: (data: T) => void) {
    getJsiBridge().registerCallback(name, callback);
  }

  static off(name: string) {
    getJsiBridge().removeCallback(name);
  }

  static emit(name: string, data?: unknown) {
    getJsiBridge().emit(name, data);
  }
}
