package com.wgjcode.notes

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class TtsPlaybackServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TtsPlaybackServiceModule"

    @ReactMethod
    fun start(promise: Promise) {
        // Android 13+ 需要 POST_NOTIFICATIONS 运行时权限
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val activity = currentActivity
            if (activity != null && ContextCompat.checkSelfPermission(
                    activity, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1002
                )
            }
        }
        TtsPlaybackService.startService(reactApplicationContext)
        promise.resolve(null)
    }

    @ReactMethod
    fun stop(promise: Promise) {
        TtsPlaybackService.stopService(reactApplicationContext)
        promise.resolve(null)
    }
}
