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

class RecordingServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "RecordingServiceModule"

    @ReactMethod
    fun startService(promise: Promise) {
        // Android 13+ 需要 POST_NOTIFICATIONS 运行时权限
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val activity = currentActivity
            if (activity != null && ContextCompat.checkSelfPermission(
                    activity, Manifest.permission.POST_NOTIFICATIONS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                // 请求权限，但不阻塞启动 Service
                // Service 可以在没有通知权限的情况下运行，只是不显示通知
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            }
        }
        RecordingService.startService(reactApplicationContext)
        promise.resolve(null)
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        RecordingService.stopService(reactApplicationContext)
        promise.resolve(null)
    }
}
