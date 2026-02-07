const { execSync } = require('child_process');
const path = require('path');

console.log('Rebuilding native dependencies for Electron...');

try {
    // 使用 electron-rebuild 针对当前 Electron 版本重新编译原生模块
    // -f: 强制重新编译
    // -w: 指定模块 (better-sqlite3, sharp)
    console.log('Running electron-rebuild...');
    // 注意: Windows 下 npx 可能会有问题，尝试直接调用 node_modules/.bin/electron-rebuild
    // 或者依赖 package.json 中的 install 脚本自动 rebuild (如果有的话)
    // 这里使用 npx 尝试
    execSync('npx electron-rebuild -f -w better-sqlite3,sharp', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: true
    });
    console.log('Native dependencies rebuilt successfully.');
} catch (error) {
    console.error('Failed to rebuild native dependencies:', error);
    // 不强制退出，因为可能已经编译过了或者开发环境差异
    // process.exit(1); 
}
