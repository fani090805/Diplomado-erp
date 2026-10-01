package com.diplomado.erp.core.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "erp_constructor_cache")

class OfflineCacheManager(private val context: Context) {

    companion object {
        private val KEY_CACHED_PROJECTS = stringPreferencesKey("cached_projects_json")
        private val KEY_CACHED_MATERIALS = stringPreferencesKey("cached_materials_json")
        private val KEY_LAST_SYNC_TIME = stringPreferencesKey("last_sync_timestamp")
    }

    val cachedProjects: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_CACHED_PROJECTS]
    }

    val cachedMaterials: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[KEY_CACHED_MATERIALS]
    }

    suspend fun saveProjectsCache(json: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_CACHED_PROJECTS] = json
            prefs[KEY_LAST_SYNC_TIME] = System.currentTimeMillis().toString()
        }
    }

    suspend fun saveMaterialsCache(json: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_CACHED_MATERIALS] = json
            prefs[KEY_LAST_SYNC_TIME] = System.currentTimeMillis().toString()
        }
    }

    suspend fun clearCache() {
        context.dataStore.edit { prefs ->
            prefs.clear()
        }
    }
}
