> English | [简体中文](./README.md)

# react-native-jsi-bridge-2

React Native JSI library for communicate between js and native code via jsi skipping the react-native bridge which improve performance and skips data serialization/deserialization.

Based on [sergeymild/react-native-jsi-bridge](https://github.com/sergeymild/react-native-jsi-bridge), fixed build on RN 0.71.x and support bridging any JS types.

## Prerequisite

react-native >= 0.73

It you are using lower version of RN, please download package version 1.0.0

## Installation

```sh
yarn add react-native-jsi-bridge-2
# and npx pod-install
```

## Usage JS

on js side just import `import { JsiBridge } from 'react-native-jsi-bridge-2'`
and subscribe on events which will be fired from native code.
```typescript
import { JsiBridge } from 'react-native-jsi-bridge-2';

// for subscribe
JsiBridge.on('eventNameInJsCode', (data: any) => {

})

// for unsubscribe
JsiBridge.off('eventNameInJsCode')
```

For send event to native code
```typescript
// send event to native code
JsiBridge.emit('eventNameInNativeCode', { user: "your name" })
```

## Usage Native Java

On native side (Java/Kotlin)
```java

// for subscribe
JsiBridge.on('eventNameInNativeCode', data -> {

})

// for unsubscribe
JsiBridge.off('eventNameInNativeCode')

// send event to js code
JsiBridge.emit('eventNameInJsCode', data)
```

## Usage Native Objective-c

On native side
```
#import "JsiBridgeEmitter.h"

// for subscribe
[[JsiBridgeEmitter shared] on:@"eventNameInNativeCode" with:^(id data) {
  // some logic
}];

// for unsubscribe
[[JsiBridgeEmitter shared] off:@"eventNameInNativeCode"];

// send event to js code
[[JsiBridgeEmitter shared] emit:@"eventNameInJsCode" with:@"data"];
```

## License

MIT
