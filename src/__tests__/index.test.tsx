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
  _JsiBridge?: JsiBridgeMock;
};

type LoadBridgeOptions = {
  /** 预置 global._JsiBridge，模拟绑定已由框架安装 */
  preinstalled?: boolean;
  /** 在 require('../index') 之前执行的额外环境准备 */
  setup?: (context: {
    reactNative: ReactNativeMock;
    testGlobal: TestGlobal;
  }) => void;
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

const loadBridge = ({ preinstalled = true, setup }: LoadBridgeOptions = {}) => {
  jest.resetModules();

  const testGlobal = globalThis as TestGlobal;

  const jsiBridge: JsiBridgeMock = {
    registerCallback: jest.fn(),
    removeCallback: jest.fn(),
    emit: jest.fn(),
  };
  if (preinstalled) {
    testGlobal._JsiBridge = jsiBridge;
  } else {
    delete testGlobal._JsiBridge;
  }

  const reactNative = require('react-native') as ReactNativeMock;
  setup?.({ reactNative, testGlobal });

  const bridgeModule = require('../index') as {
    JsiBridge: typeof JsiBridgeClass;
  };

  return {
    JsiBridge: bridgeModule.JsiBridge,
    jsiBridge,
    nativeModule: reactNative.NativeModules.JsiBridge,
    turboModuleRegistry: reactNative.TurboModuleRegistry,
    testGlobal,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  const testGlobal = globalThis as TestGlobal;
  delete testGlobal._JsiBridge;
  jest.resetModules();
});

describe('initialization', () => {
  it('does nothing when JSI bindings are already installed', () => {
    const { nativeModule, turboModuleRegistry } = loadBridge();

    expect(turboModuleRegistry.getEnforcing).not.toHaveBeenCalled();
    expect(nativeModule.install).not.toHaveBeenCalled();
  });

  it('installs bindings through TurboModuleRegistry when they are missing', () => {
    const { nativeModule, turboModuleRegistry, testGlobal } = loadBridge({
      preinstalled: false,
      setup: ({ reactNative, testGlobal: globalWithBridge }) => {
        (
          reactNative.TurboModuleRegistry.getEnforcing as jest.Mock
        ).mockImplementation(() => {
          globalWithBridge._JsiBridge = {
            registerCallback: jest.fn(),
            removeCallback: jest.fn(),
            emit: jest.fn(),
          };
          return {};
        });
      },
    });

    expect(turboModuleRegistry.getEnforcing).toHaveBeenCalledTimes(1);
    expect(turboModuleRegistry.getEnforcing).toHaveBeenCalledWith('JsiBridge');
    expect(testGlobal._JsiBridge).not.toBeUndefined();
    expect(nativeModule.install).not.toHaveBeenCalled();
  });

  it('falls back to the synchronous native install when the framework path fails', () => {
    const { nativeModule, turboModuleRegistry } = loadBridge({
      preinstalled: false,
      setup: ({ reactNative }) => {
        (
          reactNative.TurboModuleRegistry.getEnforcing as jest.Mock
        ).mockImplementation(() => {
          throw new Error(
            'TurboModuleRegistry.getEnforcing(...): JsiBridge could not be found.'
          );
        });
      },
    });

    expect(turboModuleRegistry.getEnforcing).toHaveBeenCalledTimes(1);
    expect(nativeModule.install).toHaveBeenCalledTimes(1);
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
