package com.wgjcode.notes

import android.os.PowerManager
import android.app.Activity
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class WakeLockModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private var wakeLock: PowerManager.WakeLock? = null

    override fun getName(): String = "WakeLockModule"

    @ReactMethod
    fun acquire() {
        if (wakeLock != null) return // 已持有
        val pm = reactApplicationContext.getSystemService(Activity.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "notes:recording"
        ).apply {
            acquire()
        }
    }

    @ReactMethod
    fun release() {
        wakeLock?.let {
            if (it.isHeld) it.release()
            wakeLock = null
        }
    }
}
