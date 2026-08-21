/* eslint-disable react-native/no-inline-styles */
import * as React from 'react';
import {
  NativeModules,
  Platform,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TouchableOpacity,
  TurboModuleRegistry,
  useColorScheme,
} from 'react-native';
import { JsiBridge } from 'react-native-jsi-bridge-2';

const isIOS = Platform.OS === 'ios';

type ExampleJsiBridgeTestModule = {
  emitNativeValue(value: unknown): void;
  emitWebViewMessage(payload: unknown): void;
  emitPreloadEvent(status: string): void;
};

const ExampleJsiBridgeTest = isIOS
  ? (NativeModules.ExampleJsiBridgeTest as ExampleJsiBridgeTestModule)
  : undefined;

const Text = ({ style, ...rest }: React.ComponentProps<typeof RNText>) => {
  const isDark = useColorScheme() === 'dark';

  return (
    <RNText {...rest} style={[style, { color: isDark ? '#fff' : '#111' }]} />
  );
};

const Btn = ({
  children,
  onPress,
  disabled = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
}) => {
  const isDark = useColorScheme() === 'dark';
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        {
          borderColor: isDark ? '#fff' : '#111',
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text>{children}</Text>
    </TouchableOpacity>
  );
};

type InstalledJsiBridge = {
  registerCallback(name: string, callback: (data: unknown) => void): void;
  removeCallback(name: string): void;
  emit(name: string, data?: unknown): void;
};
type NativeJsiBridgeModule = {
  getStatus?: () => Promise<string>;
  install?: () => unknown;
};

function formatValue(value: unknown): string {
  const type =
    value === null
      ? 'null'
      : value === undefined
      ? 'undefined'
      : Array.isArray(value)
      ? 'array'
      : typeof value;

  if (value === undefined) {
    return `${type}: undefined`;
  }

  try {
    const serialized = JSON.stringify(value);
    return `${type}: ${serialized === undefined ? String(value) : serialized}`;
  } catch {
    return `${type}: ${String(value)}`;
  }
}

export default function App() {
  const [jsiStatus, setJsiStatus] = React.useState('检查中');
  const [nativeModuleStatus, setNativeModuleStatus] = React.useState('检查中');
  const [onDataResult, setOnDataResult] = React.useState('尚未收到 onData');
  const [webviewMessage, setWebviewMessage] = React.useState(
    '尚未收到 example.webview.message'
  );
  const [networkResponse, setNetworkResponse] = React.useState(
    '尚未收到 example.webview.response'
  );
  const [preloadStatus, setPreloadStatus] = React.useState(
    '尚未收到 example.preload.event'
  );

  const isDark = useColorScheme() === 'dark';
  const bridge = (
    globalThis as typeof globalThis & { _JsiBridge?: InstalledJsiBridge }
  )._JsiBridge;
  const hasValidBridge = Boolean(
    bridge &&
      typeof bridge.registerCallback === 'function' &&
      typeof bridge.removeCallback === 'function' &&
      typeof bridge.emit === 'function'
  );
  const nativeJsiBridge = TurboModuleRegistry.get<NativeJsiBridgeModule>('JsiBridge');
  const hasTurboModuleProxy = Boolean(
    (globalThis as typeof globalThis & { __turboModuleProxy?: object })
      .__turboModuleProxy
  );

  const nativeHarnessReady = isIOS && Boolean(ExampleJsiBridgeTest) && hasValidBridge;
  React.useEffect(() => {
    let mounted = true;
    console.log('[ExampleJsiBridgeTest] diagnostics', {
      nativeModule: Boolean(nativeJsiBridge),
      turboModuleProxy: hasTurboModuleProxy,
      globalBridge: Boolean(bridge),
      validBridge: hasValidBridge,
    });
    setNativeModuleStatus(
      nativeJsiBridge
        ? `TurboModuleRegistry.get('JsiBridge') 已注册；TurboModuleProxy=${hasTurboModuleProxy}`
        : `TurboModuleRegistry.get('JsiBridge') 未注册；TurboModuleProxy=${hasTurboModuleProxy}`
    );
    nativeJsiBridge?.getStatus?.()
      .then(status => {
        if (mounted) {
          setNativeModuleStatus(`JsiBridge.getStatus()=${status}`);
        }
      })
      .catch(error => {
        if (mounted) {
          setNativeModuleStatus(`getStatus 失败：${String(error)}`);
        }
      });

    setJsiStatus(
      hasValidBridge
        ? '已安装：global._JsiBridge 及三个函数均正常'
        : '未安装或函数类型不正确，未注册任何监听器'
    );
    if (!hasValidBridge) {
      return () => {
        mounted = false;
      };
    }

    JsiBridge.on('onData', (data: unknown) => {
      if (mounted) {
        setOnDataResult(formatValue(data));
      }
    });
    JsiBridge.on('example.webview.message', (data: unknown) => {
      if (mounted) {
        setWebviewMessage(formatValue(data));
      }
    });
    JsiBridge.on('example.webview.response', (data: unknown) => {
      if (mounted) {
        setNetworkResponse(formatValue(data));
      }
    });
    JsiBridge.on('example.preload.event', (data: unknown) => {
      if (mounted) {
        setPreloadStatus(formatValue(data));
      }
    });

    return () => {
      mounted = false;
      JsiBridge.off('onData');
      JsiBridge.off('example.webview.message');
      JsiBridge.off('example.webview.response');
      JsiBridge.off('example.preload.event');
    };
  }, []);

  const sendJsData = (value: unknown) => JsiBridge.emit('jsData', value);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      style={{ backgroundColor: isDark ? '#111' : '#fff' }}
    >
      <Text style={styles.title}>JsiBridge Example 调试页（iOS-only harness）</Text>
      <Text style={styles.result}>
        {isIOS
          ? ExampleJsiBridgeTest
            ? 'iOS native test module ready'
            : 'iOS native test module unavailable'
          : 'Android：iOS native test controls disabled'}
      </Text>
      <Text style={styles.sectionTitle}>1. JSI 安装状态</Text>
      <Text style={styles.result}>{jsiStatus}</Text>
      <Text style={styles.result}>{nativeModuleStatus}</Text>

      <Text style={styles.sectionTitle}>2. JS → Native → JS（jsData）</Text>
      <Text style={styles.result}>{onDataResult}</Text>
      <Btn
        disabled={!hasValidBridge}
        onPress={() => sendJsData('example string')}
      >
        发送 string
      </Btn>
      <Btn disabled={!hasValidBridge} onPress={() => sendJsData(42.5)}>
        发送 number
      </Btn>
      <Btn disabled={!hasValidBridge} onPress={() => sendJsData(true)}>
        发送 boolean
      </Btn>
      <Btn
        disabled={!hasValidBridge}
        onPress={() => sendJsData({ user: 'example', value: 1 })}
      >
        发送 object
      </Btn>
      <Btn
        disabled={!hasValidBridge}
        onPress={() => sendJsData(['example', 1, false])}
      >
        发送 array
      </Btn>
      <Btn disabled={!hasValidBridge} onPress={() => sendJsData(null)}>
        发送 null
      </Btn>
      <Btn
        disabled={!hasValidBridge}
        onPress={() => JsiBridge.emit('jsData', undefined)}
      >
        发送 undefined
      </Btn>

      <Text style={styles.sectionTitle}>3. Native → JS（onData）</Text>
      <Btn
        disabled={!nativeHarnessReady}
        onPress={() => ExampleJsiBridgeTest?.emitNativeValue('native string')}
      >
        Native 发送 string
      </Btn>
      <Btn
        disabled={!nativeHarnessReady}
        onPress={() => ExampleJsiBridgeTest?.emitNativeValue({ from: 'native' })}
      >
        Native 发送 object
      </Btn>
      <Btn
        disabled={!nativeHarnessReady}
        onPress={() => ExampleJsiBridgeTest?.emitNativeValue(null)}
      >
        Native 发送 null
      </Btn>

      <Text style={styles.sectionTitle}>4. iNCU-like 事件模拟（iOS harness）</Text>
      <Btn
        disabled={!nativeHarnessReady}
        onPress={() =>
          ExampleJsiBridgeTest?.emitWebViewMessage({
            source: 'native',
            data: 'WebView onMessage equivalent',
          })
        }
      >
        Native 触发 WebView message
      </Btn>
      <Text style={styles.result}>{webviewMessage}</Text>

      <Btn
        disabled={!nativeHarnessReady}
        onPress={() =>
          JsiBridge.emit('example.webview.injectJavaScript', {
            javascript: 'document.title',
            source: 'example debug page',
          })
        }
      >
        JS 发送 injectJavaScript
      </Btn>

      <Btn
        disabled={!nativeHarnessReady}
        onPress={() =>
          JsiBridge.emit('example.webview.network', {
            taskId: `example-${Date.now()}`,
            url: 'https://example.invalid/data',
            method: 'GET',
            data: { request: 'example' },
            headers: { Accept: 'application/json' },
          })
        }
      >
        JS 发送 network 请求
      </Btn>
      <Text style={styles.result}>{networkResponse}</Text>

      <Btn
        disabled={!nativeHarnessReady}
        onPress={() => ExampleJsiBridgeTest?.emitPreloadEvent('finish')}
      >
        Native 触发 preload finish
      </Btn>
      <Btn
        disabled={!nativeHarnessReady}
        onPress={() => ExampleJsiBridgeTest?.emitPreloadEvent('error')}
      >
        Native 触发 preload error
      </Btn>
      <Text style={styles.result}>{preloadStatus}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  result: {
    marginBottom: 8,
  },
  btn: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
  },
});
