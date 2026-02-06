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
                // 深色背景色系
                'nexus-bg': {
                    DEFAULT: '#0a0a0f',
                    secondary: '#12121a',
                    tertiary: '#1a1a24',
                    hover: '#22222e'
                },
                // 霓虹强调色
                'neon': {
                    cyan: '#00f0ff',
                    purple: '#bf00ff',
                    green: '#00ff88',
                    pink: '#ff0080'
                },
                // 文字颜色
                'nexus-text': {
                    primary: '#ffffff',
                    secondary: '#a0a0b0',
                    muted: '#606070'
                }
            },
            fontFamily: {
                'display': ['Outfit', 'sans-serif'],
                'body': ['IBM Plex Sans', 'sans-serif']
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
