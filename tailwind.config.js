/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Swiss Design / Clean Tech Palette
                'nexus-bg': {
                    DEFAULT: 'var(--nexus-bg)',
                    secondary: 'var(--nexus-bg-secondary)',
                    tertiary: 'var(--nexus-bg-tertiary)',
                    hover: 'var(--nexus-bg-hover)'
                },
                // Accents
                'neon': {
                    cyan: '#10B981', // Mapping 'cyan' to Emerald Green (Primary Action)
                    purple: '#64748B', // Mapping 'purple' to Slate Gray (Secondary/Neutral)
                    green: '#10B981', // Emerald Green
                    pink: '#EF4444', // Red for errors/alerts
                    electric: '#10B981' // Emerald Green
                },
                // Text Colors
                'nexus-text': {
                    primary: 'var(--nexus-text-primary)',
                    secondary: 'var(--nexus-text-secondary)',
                    muted: 'var(--nexus-text-muted)'
                },
                'nexus-border': 'var(--nexus-border)'
            },
            fontFamily: {
                'sans': ['"HarmonyOS Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                'display': ['"HarmonyOS Sans SC"', '"PingFang SC"', 'Inter', 'system-ui', 'sans-serif'],
                'body': ['"HarmonyOS Sans SC"', '"PingFang SC"', 'Inter', 'system-ui', 'sans-serif'],
                'mono': ['"JetBrains Mono"', 'monospace']
            },
            boxShadow: {
                'clean': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'clean-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)',
                // Mapping old neon shadows to clean shadows
                'neon-cyan': '0 4px 12px rgba(16, 185, 129, 0.15)',
                'neon-purple': '0 4px 12px rgba(0, 0, 0, 0.05)',
                'neon-glow': '0 0 0 0 transparent' // Remove intense glow
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                // Remove glow animation or make it subtle fade
                'glow': 'none'
            },
            borderRadius: {
                'xl': '16px',
                '2xl': '24px'
            }
        },
    },
    plugins: [],
}
