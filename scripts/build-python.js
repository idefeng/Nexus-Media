const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Building Python backend...');

const pythonScript = path.resolve(__dirname, '../ai_engine/main.py');
const outputResourcesDir = path.resolve(__dirname, '../resources/bin');

if (!fs.existsSync(outputResourcesDir)) {
    fs.mkdirSync(outputResourcesDir, { recursive: true });
}

if (!fs.existsSync(pythonScript)) {
    console.warn(`Python script not found at ${pythonScript}, skipping build.`);
    process.exit(0);
}

try {
    // 检查 pyinstaller 是否可用
    execSync('pyinstaller --version', { stdio: 'ignore' });
    console.log('PyInstaller found, creating executable...');

    const cmd = `pyinstaller --clean --noconfirm --onefile --windowed --name server --distpath "${outputResourcesDir}" --specpath "${path.resolve(__dirname, '../build')}" "${pythonScript}"`;

    console.log(`Executing: ${cmd}`);
    execSync(cmd, {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        shell: true
    });

    console.log(`Python backend built successfully at ${path.join(outputResourcesDir, 'server.exe')}`);

} catch (error) {
    console.warn('PyInstaller build failed or not found. Skipping Python build step. Ensure server.exe exists in resources/bin before packaging if needed.');
    console.error(error.message);
}
