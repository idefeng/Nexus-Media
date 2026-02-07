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
                // Graphite Gray Palette
                'nexus-bg': {
                    DEFAULT: '#121212', // Graphite Base
                    secondary: '#1C1C1E', // Graphite Secondary
                    tertiary: '#2C2C2E', // Graphite Tertiary
                    hover: '#3A3A3C'
                },
                // Electric Blue & Accents
                'neon': {
                    cyan: '#00f0ff',
                    purple: '#bf00ff',
                    green: '#00ff88',
                    pink: '#ff0080',
                    electric: '#2997FF' // Electric Blue
                },
                // Text Colors
                'nexus-text': {
                    primary: '#FFFFFF',
                    secondary: '#EBEBF5', // 60% White
                    muted: '#8E8E93' // Gray
                }
            },
            fontFamily: {
                'display': ['Inter', 'sans-serif'],
                'body': ['Inter', 'sans-serif'],
                'mono': ['JetBrains Mono', 'monospace']
            },
            boxShadow: {
                'neon-cyan': '0 0 20px rgba(0, 240, 255, 0.3)',
                'neon-purple': '0 0 20px rgba(191, 0, 255, 0.3)',
                'neon-glow': '0 0 40px rgba(0, 240, 255, 0.15), 0 0 80px rgba(191, 0, 255, 0.1)'
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glow': 'glow 2s ease-in-out infinite alternate'
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.2)' }
                }
            }
        },
    },
    plugins: [],
}
