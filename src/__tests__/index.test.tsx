import type { JsiBridge as JsiBridgeClass } from '../index';

type JsiBridgeMock = {
  registerCallback: jest.Mock;
  removeCallback: jest.Mock;
  emit: jest.Mock;
};

type ReactNativeMock = {
  NativeModules: {
    JsiBridge: {
      install: jest.Mock;
    };
  };
  TurboModuleRegistry: {
    getEnforcing: jest.Mock;
  };
};

type TestGlobal = typeof globalThis & {
  __turboModuleProxy?: object;
  _JsiBridge?: JsiBridgeMock;
};

jest.mock('react-native', () => ({
  NativeModules: {
    JsiBridge: {
      install: jest.fn(),
    },
  },
  Platform: {
    select: (options: { default: string; ios?: string }) => options.default,
  },
  TurboModuleRegistry: {
    getEnforcing: jest.fn(),
  },
}));

const loadBridge = (newArchitecture = false) => {
  jest.resetModules();

  const testGlobal = globalThis as TestGlobal;
  testGlobal.__turboModuleProxy = newArchitecture ? {} : undefined;

  const jsiBridge: JsiBridgeMock = {
    registerCallback: jest.fn(),
    removeCallback: jest.fn(),
    emit: jest.fn(),
  };
  testGlobal._JsiBridge = jsiBridge;

  const reactNative = require('react-native') as ReactNativeMock;
  const bridgeModule = require('../index') as {
    JsiBridge: typeof JsiBridgeClass;
  };

  return {
    JsiBridge: bridgeModule.JsiBridge,
    jsiBridge,
    nativeModule: reactNative.NativeModules.JsiBridge,
    turboModuleRegistry: reactNative.TurboModuleRegistry,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  const testGlobal = globalThis as TestGlobal;
  delete testGlobal.__turboModuleProxy;
  delete testGlobal._JsiBridge;
  jest.resetModules();
});

describe('initialization', () => {
  it('installs the legacy native module without using TurboModuleRegistry', () => {
    const { nativeModule, turboModuleRegistry } = loadBridge();

    expect(nativeModule.install).toHaveBeenCalledTimes(1);
    expect(turboModuleRegistry.getEnforcing).not.toHaveBeenCalled();
  });

  it('initializes the TurboModule in the New Architecture', () => {
    const { nativeModule, turboModuleRegistry } = loadBridge(true);

    expect(turboModuleRegistry.getEnforcing).toHaveBeenCalledTimes(1);
    expect(turboModuleRegistry.getEnforcing).toHaveBeenCalledWith('JsiBridge');
    expect(nativeModule.install).not.toHaveBeenCalled();
  });
});

describe('JsiBridge API', () => {
  it('forwards event names and callbacks to on and off', () => {
    const { JsiBridge, jsiBridge } = loadBridge();
    const callback = jest.fn();

    JsiBridge.on('message', callback);
    JsiBridge.off('message');

    expect(jsiBridge.registerCallback).toHaveBeenCalledTimes(1);
    expect(jsiBridge.registerCallback).toHaveBeenCalledWith(
      'message',
      callback
    );
    expect(jsiBridge.removeCallback).toHaveBeenCalledTimes(1);
    expect(jsiBridge.removeCallback).toHaveBeenCalledWith('message');
  });

  it.each([
    ['string', 'value'],
    ['number', 42],
    ['boolean', true],
    ['object', { key: 'value' }],
    ['array', ['first', 2]],
    ['null', null],
    ['undefined', undefined],
  ] as Array<readonly [string, unknown]>)(
    'forwards %s payloads unchanged',
    (kind, payload) => {
      const { JsiBridge, jsiBridge } = loadBridge();
      const eventName = `${kind}-event`;

      JsiBridge.emit(eventName, payload);

      expect(jsiBridge.emit).toHaveBeenCalledTimes(1);
      const call = jsiBridge.emit.mock.calls[0] as [string, unknown];
      expect(call[0]).toBe(eventName);
      expect(call[1]).toBe(payload);
    }
  );
});
