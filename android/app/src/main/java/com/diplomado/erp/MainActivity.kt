package com.diplomado.erp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.diplomado.erp.core.network.live.LiveEvents
import com.diplomado.erp.core.security.TokenStorage
import com.diplomado.erp.ui.navigation.NavGraph
import com.diplomado.erp.ui.theme.FaiTheme
import com.diplomado.erp.ui.theme.FaiBackground

class MainActivity : ComponentActivity() {

    /** true después de pasar por segundo plano (para refrescar al volver). */
    private var wasInBackground = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FaiTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = FaiBackground
                ) {
                    NavGraph()
                }
            }
        }
    }

    /** Primer plano: abre el canal en vivo y, si veníamos de segundo plano, refresca la pantalla actual. */
    override fun onStart() {
        super.onStart()
        if (TokenStorage.getAccessToken().isNullOrEmpty()) return
        LiveEvents.start()
        if (wasInBackground) LiveEvents.notifyResume()
    }

    /** Segundo plano: cierra el canal en vivo (no gasta batería ni datos). */
    override fun onStop() {
        super.onStop()
        if (!isChangingConfigurations) {
            LiveEvents.stop()
            wasInBackground = true
        }
    }
}
