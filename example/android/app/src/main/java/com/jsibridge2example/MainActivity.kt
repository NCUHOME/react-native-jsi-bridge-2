package com.jsibridge2example

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableMap
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.reactnativejsibridge.JsiBridge

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "JsiBridge2Example"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    JsiBridge.off("jsData")
    JsiBridge.on("jsData") { data ->
      handleJsData(data)
    }


    JsiBridge.off("example.webview.injectJavaScript")
    JsiBridge.on("example.webview.injectJavaScript") { data ->
      val message = Arguments.createMap()
      message.putString("type", "injectJavaScript")
      message.putBoolean("nativeReceived", true)
      putValue(message, "payload", data)
      JsiBridge.emit("example.webview.message", message)
    }

    JsiBridge.off("example.webview.network")
    JsiBridge.on("example.webview.network") { data ->
      val response = Arguments.createMap()
      if (data is ReadableMap && data.hasKey("taskId") && !data.isNull("taskId")) {
        copyValue(data, response, "taskId")
      } else {
        response.putString("taskId", "example-task")
      }
      val responseData = Arguments.createMap()
      responseData.putBoolean("ok", true)
      response.putMap("data", responseData)
      val headers = Arguments.createMap()
      headers.putString("content-type", "application/json")
      headers.putString("x-example", "true")
      response.putMap("resHeader", headers)
      JsiBridge.emit("example.webview.response", response)
    }
  }

  private fun handleJsData(data: Any?) {
    if (data is ReadableMap && data.hasKey("__debugEvent") && !data.isNull("__debugEvent")) {
      when (data.getString("__debugEvent")) {
        "example.webview.message" ->
          JsiBridge.emit("example.webview.message", data.getMap("__payload"))
        "example.preload.event" -> {
          val event = Arguments.createMap()
          event.putString("status", data.getString("__payload") ?: "error")
          JsiBridge.emit("example.preload.event", event)
        }
      }
      return
    }
    JsiBridge.emit("onData", data)
  }

  private fun copyValue(source: ReadableMap, target: WritableMap, key: String) {
    when (source.getType(key)) {
      ReadableType.Boolean -> target.putBoolean(key, source.getBoolean(key))
      ReadableType.Number -> target.putDouble(key, source.getDouble(key))
      ReadableType.String -> target.putString(key, source.getString(key))
      ReadableType.Map -> target.putMap(key, source.getMap(key))
      ReadableType.Array -> target.putArray(key, source.getArray(key))
      ReadableType.Null -> target.putNull(key)
    }
  }

  private fun putValue(target: WritableMap, key: String, value: Any?) {
    when (value) {
      null -> target.putNull(key)
      is ReadableMap -> target.putMap(key, value)
      is ReadableArray -> target.putArray(key, value)
      is Boolean -> target.putBoolean(key, value)
      is Number -> target.putDouble(key, value.toDouble())
      else -> target.putString(key, value.toString())
    }
  }
}
