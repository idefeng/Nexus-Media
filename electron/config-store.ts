/**
 * Configuration Store for Nexus Media
 * Custom JSON-based configuration management (no external dependencies)
 */
import { app } from 'electron'
import path from 'path'
import fs from 'fs-extra'

export interface ScanDirectory {
    path: string
    addedAt: string
    lastScan?: string
}

export interface AppConfig {
    // Database settings
    database: {
        path: string // Custom database path
        autoBackup: boolean
    }

    // Scan directories
    scanDirectories: ScanDirectory[]

    // EXIF settings
    exif: {
        enabled: boolean
        autoExtract: boolean
    }

    // AI settings
    ai: {
        enabled: boolean
        useCuda: boolean // GPU acceleration
        autoAnalyze: boolean // Auto-analyze new imports
    }

    // UI preferences
    ui: {
        sidebarCollapsed: boolean
        gridSize: 'small' | 'medium' | 'large'
        theme: 'light' | 'dark' | 'auto'
        language: 'zh-CN' | 'en-US'
    }

    // Search history (last 20 searches)
    searchHistory: string[]

    // App metadata
    version: string
    firstRun: boolean
}

// Configuration file path
let configPath: string

// In-memory config cache
let _config: AppConfig | null = null

// Get default configuration
function getDefaultConfig(): AppConfig {
    return {
        database: {
            path: path.join(app.getPath('userData'), 'nexus_media.db'),
            autoBackup: true
        },
        scanDirectories: [],
        exif: {
            enabled: true,
            autoExtract: true
        },
        ai: {
            enabled: true,
            useCuda: false,
            autoAnalyze: true
        },
        ui: {
            sidebarCollapsed: false,
            gridSize: 'medium',
            theme: 'auto',
            language: 'zh-CN'
        },
        searchHistory: [],
        version: app.getVersion(),
        firstRun: true
    }
}

// Initialize config path
function initConfigPath() {
    if (!configPath) {
        const userDataPath = app.getPath('userData')
        configPath = path.join(userDataPath, 'nexus-media-config.json')
        console.log('[Config] Config path:', configPath)
    }
}

// Load configuration from file
function loadConfig(): AppConfig {
    initConfigPath()

    console.log('[Config] Loading config from:', configPath)

    try {
        if (fs.existsSync(configPath)) {
            const data = fs.readFileSync(configPath, 'utf-8')
            const loaded = JSON.parse(data) as Partial<AppConfig>
            const defaults = getDefaultConfig()

            console.log('[Config] Loaded existing config, database path:', loaded.database?.path)

            // Deep merge: merge nested objects properly
            return {
                database: { ...defaults.database, ...loaded.database },
                scanDirectories: loaded.scanDirectories || defaults.scanDirectories,
                exif: { ...defaults.exif, ...loaded.exif },
                ai: { ...defaults.ai, ...loaded.ai },
                ui: { ...defaults.ui, ...loaded.ui },
                searchHistory: loaded.searchHistory || defaults.searchHistory,
                version: loaded.version || defaults.version,
                firstRun: loaded.firstRun !== undefined ? loaded.firstRun : defaults.firstRun
            }
        }
    } catch (error) {
        console.error('Failed to load config:', error)
    }

    // Return default config if file doesn't exist or loading failed
    const defaultConfig = getDefaultConfig()
    console.log('[Config] Using default config, database path:', defaultConfig.database.path)
    // Save default config for first run
    saveConfig(defaultConfig)
    return defaultConfig
}

// Save configuration to file
function saveConfig(config: AppConfig): void {
    initConfigPath()

    try {
        // Ensure directory exists
        fs.ensureDirSync(path.dirname(configPath))
        // Write config file
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
    } catch (error) {
        console.error('Failed to save config:', error)
    }
}

// Get config instance (lazy load)
function getConfig(): AppConfig {
    if (!_config) {
        _config = loadConfig()
    }
    return _config
}

// Export config store interface
export const configStore = {
    get store(): AppConfig {
        return getConfig()
    },
    set store(value: AppConfig) {
        _config = value
        saveConfig(value)
    },
    get(key: string): any {
        const config = getConfig()
        // Support nested paths like 'database.path'
        if (key.includes('.')) {
            const parts = key.split('.')
            let value: any = config
            for (const part of parts) {
                value = value?.[part]
            }
            console.log(`[Config] Get ${key}:`, value)
            return value
        }
        console.log(`[Config] Get ${key}:`, (config as any)[key])
        return (config as any)[key]
    },
    set(key: string, value: any): void {
        const config = getConfig()
        // Support nested paths like 'database.path'
        if (key.includes('.')) {
            const parts = key.split('.')
            let target: any = config
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]]
            }
            target[parts[parts.length - 1]] = value
        } else {
            (config as any)[key] = value
        }
        _config = config
        saveConfig(config)
    },
    clear(): void {
        _config = getDefaultConfig()
        saveConfig(_config)
    }
}

// Helper functions
export const getConfigValue = <K extends keyof AppConfig>(key: K): AppConfig[K] => {
    return configStore.get(key)
}

export const setConfigValue = <K extends keyof AppConfig>(key: K, value: AppConfig[K]): void => {
    configStore.set(key, value)
}

export const updateConfig = (updates: Partial<AppConfig>): void => {
    const config = getConfig()
    Object.assign(config, updates)
    _config = config
    saveConfig(config)
}

export const resetConfig = (): void => {
    configStore.clear()
}

// Add search to history (max 20 items)
export const addSearchHistory = (query: string): void => {
    const history = configStore.get('searchHistory')
    const filtered = history.filter(q => q !== query)
    filtered.unshift(query)
    configStore.set('searchHistory', filtered.slice(0, 20))
}

// Add scan directory
export const addScanDirectory = (dirPath: string): boolean => {
    const dirs = configStore.get('scanDirectories')
    if (dirs.find(d => d.path === dirPath)) {
        return false // Already exists
    }
    dirs.push({
        path: dirPath,
        addedAt: new Date().toISOString()
    })
    configStore.set('scanDirectories', dirs)
    return true
}

// Remove scan directory
export const removeScanDirectory = (dirPath: string): boolean => {
    const dirs = configStore.get('scanDirectories')
    const filtered = dirs.filter(d => d.path !== dirPath)
    if (filtered.length === dirs.length) {
        return false // Not found
    }
    configStore.set('scanDirectories', filtered)
    return true
}

// Update scan timestamp
export const updateScanTimestamp = (dirPath: string): boolean => {
    const dirs = configStore.get('scanDirectories')
    const dir = dirs.find(d => d.path === dirPath)
    if (!dir) {
        return false
    }
    dir.lastScan = new Date().toISOString()
    configStore.set('scanDirectories', dirs)
    return true
}
