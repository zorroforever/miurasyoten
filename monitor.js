const { exec } = require('child_process');


const healthCheckUrl = 'http://127.0.0.1:1234/health';
const restartScriptPath = 'path\\to\\restart.bat';
const checkInterval = 30 * 1000;
const waitAfterRestart = 60 * 1000;
function getCurrentTimestamp() {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
}

async function checkHealth() {
    try {
        const response = await fetch(healthCheckUrl);
        const data = await response.json();
        if (response.ok && data.success) {
            console.log(`${getCurrentTimestamp()} - Health check successful. Service is running.`);
            return true;
        } else {
            console.log(`${getCurrentTimestamp()} - Health check failed. Response: ${JSON.stringify(data)}`);
            return false;
        }
    } catch (error) {
        console.log(`${getCurrentTimestamp()} - Health check request failed: ${error}`);
        return false;
    }
}

async function restartService() {
    return new Promise((resolve, reject) => {
        // 对于 Windows 系统
        const command = restartScriptPath;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                logger.error(`kill all chrome error: ${error}`);
                return reject(error);
            }
            logger.info(`kill all chrome: ${stdout}`);
            resolve();
        });
    });
}

async function monitor() {
    if (!await checkHealth()) {
        await restartService();
        console.log(`${getCurrentTimestamp()} - Waiting for ${waitAfterRestart / 1000} seconds after restart.`);
        setTimeout(monitor, waitAfterRestart);
    } else {
        console.log(`${getCurrentTimestamp()} - Waiting for ${checkInterval / 1000} seconds before next check.`);
        setTimeout(monitor, checkInterval);
    }
}


monitor();
