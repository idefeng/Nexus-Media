/**
 * Preferences Context
 * Manages UI preferences (grid size, theme, language) globally
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import i18n from 'i18next'

export type GridSize = 'small' | 'medium' | 'large'
export type Theme = 'light' | 'dark' | 'auto'
export type Language = 'zh-CN' | 'en-US'

export interface UIPreferences {
    gridSize: GridSize
    theme: Theme
    language: Language
    sidebarCollapsed: boolean
}

interface PreferencesContextType {
    preferences: UIPreferences
    updateGridSize: (size: GridSize) => Promise<void>
    updateTheme: (theme: Theme) => Promise<void>
    updateLanguage: (language: Language) => Promise<void>
    toggleSidebar: () => Promise<void>
}

const defaultPreferences: UIPreferences = {
    gridSize: 'medium',
    theme: 'dark',
    language: 'zh-CN',
    sidebarCollapsed: false
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined)

export function PreferencesProvider({ children }: { children: ReactNode }) {
    const [preferences, setPreferences] = useState<UIPreferences>(defaultPreferences)
    const [isLoaded, setIsLoaded] = useState(false)

    // Load preferences from config on mount
    useEffect(() => {
        loadPreferences()
    }, [])

    // Apply theme whenever it changes
    useEffect(() => {
        const root = window.document.documentElement
        const applyTheme = (theme: Theme) => {
            let actualTheme: 'light' | 'dark' = 'light'

            if (theme === 'auto') {
                actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            } else {
                actualTheme = theme as 'light' | 'dark'
            }

            if (actualTheme === 'dark') {
                root.classList.add('dark')
            } else {
                root.classList.remove('dark')
            }
        }

        applyTheme(preferences.theme)

        // Listen for system theme changes if set to 'auto'
        if (preferences.theme === 'auto') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            const listener = (e: MediaQueryListEvent) => {
                if (e.matches) {
                    root.classList.add('dark')
                } else {
                    root.classList.remove('dark')
                }
            }
            mediaQuery.addEventListener('change', listener)
            return () => mediaQuery.removeEventListener('change', listener)
        }
    }, [preferences.theme])

    // Apply language whenever it changes
    useEffect(() => {
        const i18nLanguage = preferences.language === 'zh-CN' ? 'zh' : 'en'
        i18n.changeLanguage(i18nLanguage)
    }, [preferences.language])

    const loadPreferences = async () => {
        if (!window.electronAPI?.config) {
            console.warn('[Preferences] Electron API not available')
            setIsLoaded(true)
            return
        }

        try {
            const result = await window.electronAPI.config.getAll()
            if (result.success && result.data?.ui) {
                console.log('[Preferences] Loaded from config:', result.data.ui)
                setPreferences({
                    gridSize: result.data.ui.gridSize || 'medium',
                    theme: result.data.ui.theme || 'dark',
                    language: result.data.ui.language || 'zh-CN',
                    sidebarCollapsed: result.data.ui.sidebarCollapsed || false
                })
            }
        } catch (error) {
            console.error('[Preferences] Failed to load:', error)
        } finally {
            setIsLoaded(true)
        }
    }

    const updateGridSize = async (size: GridSize) => {
        console.log('[Preferences] Updating grid size:', size)

        // Update local state immediately for instant UI feedback
        setPreferences(prev => ({ ...prev, gridSize: size }))

        // Persist to config
        if (window.electronAPI?.config) {
            try {
                await window.electronAPI.config.update({
                    ui: { ...preferences, gridSize: size }
                })
                console.log('[Preferences] Grid size persisted')
            } catch (error) {
                console.error('[Preferences] Failed to persist grid size:', error)
            }
        }
    }

    const updateTheme = async (theme: Theme) => {
        console.log('[Preferences] Updating theme:', theme)

        setPreferences(prev => ({ ...prev, theme }))

        if (window.electronAPI?.config) {
            try {
                await window.electronAPI.config.update({
                    ui: { ...preferences, theme }
                })
                console.log('[Preferences] Theme persisted')
            } catch (error) {
                console.error('[Preferences] Failed to persist theme:', error)
            }
        }
    }

    const updateLanguage = async (language: Language) => {
        console.log('[Preferences] Updating language:', language)

        setPreferences(prev => ({ ...prev, language }))

        if (window.electronAPI?.config) {
            try {
                await window.electronAPI.config.update({
                    ui: { ...preferences, language }
                })
                console.log('[Preferences] Language persisted')
            } catch (error) {
                console.error('[Preferences] Failed to persist language:', error)
            }
        }
    }

    const toggleSidebar = async () => {
        const newState = !preferences.sidebarCollapsed
        console.log('[Preferences] Toggling sidebar:', newState)

        setPreferences(prev => ({ ...prev, sidebarCollapsed: newState }))

        if (window.electronAPI?.config) {
            try {
                await window.electronAPI.config.update({
                    ui: { ...preferences, sidebarCollapsed: newState }
                })
            } catch (error) {
                console.error('[Preferences] Failed to persist sidebar state:', error)
            }
        }
    }

    // Don't render children until preferences are loaded
    if (!isLoaded) {
        return null
    }

    return (
        <PreferencesContext.Provider
            value={{
                preferences,
                updateGridSize,
                updateTheme,
                updateLanguage,
                toggleSidebar
            }}
        >
            {children}
        </PreferencesContext.Provider>
    )
}

export function usePreferences() {
    const context = useContext(PreferencesContext)
    if (context === undefined) {
        throw new Error('usePreferences must be used within a PreferencesProvider')
    }
    return context
}
