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

// 以“绑定真的挂上全局”为成功标准，不再探测任何 global 标志：
// 1. bridgeless 下经 nativeModuleProxy 解析模块时，框架会自动执行 getBindingsInstaller；
// 2. initializeJsiBridge 主动触发上述解析；
// 3. 最后才退回 Spec 声明的同步 install()。
if (globalThis._JsiBridge == null) {
  try {
    initializeJsiBridge();
  } catch {
    // 框架解析失败时继续尝试显式 install
  }
}
if (globalThis._JsiBridge == null) {
  try {
    _JsiBridge.install?.();
  } catch {
    // 未链接或调用失败时，延迟到实际使用时再报 LINKING_ERROR
  }
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
