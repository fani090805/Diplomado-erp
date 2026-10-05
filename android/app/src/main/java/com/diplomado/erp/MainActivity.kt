package com.diplomado.erp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.diplomado.erp.ui.navigation.NavGraph
import com.diplomado.erp.ui.theme.FaiTheme
import com.diplomado.erp.ui.theme.FaiBackground

class MainActivity : ComponentActivity() {

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
}
