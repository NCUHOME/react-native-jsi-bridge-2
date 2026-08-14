# react-native-jsi-bridge-2

React Native JSI 库，通过 JSI 实现 JS 与原生代码之间的通信。跳过 React Native Bridge，避免数据序列化/反序列化，性能更优。

基于 [sergeymild/react-native-jsi-bridge](https://github.com/sergeymild/react-native-jsi-bridge)，修复了 RN 0.71.x 的构建问题，并支持桥接任意 JS 类型。

> [English](./README-CN.md) | 简体中文

## 前置要求

react-native >= 0.73

如果使用更低版本的 RN，请下载 1.0.0 版本。

## 安装

```sh
yarn add react-native-jsi-bridge-2
# 然后执行 npx pod-install
```

## JS 端用法

在 JS 端，导入 `import { JsiBridge } from 'react-native-jsi-bridge-2'`，然后订阅原生代码发送的事件。

```typescript
import { JsiBridge } from 'react-native-jsi-bridge-2';

// 订阅事件
JsiBridge.on('eventNameInJsCode', (data: any) => {

})

// 取消订阅
JsiBridge.off('eventNameInJsCode')
```

向原生代码发送事件：

```typescript
// 向原生代码发送事件
JsiBridge.emit('eventNameInNativeCode', { user: "your name" })
```

## 原生 Java 端用法

在原生端（Java/Kotlin）：

```java

// 订阅事件
JsiBridge.on('eventNameInNativeCode', data -> {

})

// 取消订阅
JsiBridge.off('eventNameInNativeCode')

// 向 JS 代码发送事件
JsiBridge.emit('eventNameInJsCode', data)
```

## 原生 Objective-C 端用法

在原生端：

```
#import "JsiBridgeEmitter.h"

// 订阅事件
[[JsiBridgeEmitter shared] on:@"eventNameInNativeCode" with:^(id data) {
  // 处理逻辑
}];

// 取消订阅
[[JsiBridgeEmitter shared] off:@"eventNameInNativeCode"];

// 向 JS 代码发送事件
[[JsiBridgeEmitter shared] emit:@"eventNameInJsCode" with:@"data"];
```

## 许可证

MIT
