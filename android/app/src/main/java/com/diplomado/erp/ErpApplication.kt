package com.diplomado.erp

import android.app.Application
import com.diplomado.erp.core.security.TokenStorage

class ErpApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        instance = this
        TokenStorage.init(this)
    }

    companion object {
        lateinit var instance: ErpApplication
            private set
    }
}
