const fs = require('fs');
const path = require('path');
/**
 * @typedef {Object} Config
 * @property {string} projectName
 * @property {int} serverPort
 * @property {boolean} headless
 * @property {string} appleLoginURL
 * @property {string} appleDeviceURL
 * @property {string} abmAccountName
 * @property {string} abmAccountPassword
 * @property {string} path2Chrome
 * @property {string} path2ChromeUserData
 * @property {string} abmCompanyName
 * @property {string} responseSuccess
 * @property {string} responseFailed
 * @property {string} callBackApiURL
 * @property {string} abmAPIClientVersion
 * @property {string} mdmServerId
 * @property {string} apiVersion
 */
/**
 * 读取并解析配置文件
 * @returns {Object} 配置信息
 */
function loadConfig() {
    const configPath = path.join(__dirname, 'config.json');
    const configData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(configData);
}
/** @type {Config} */
const config = loadConfig();

module.exports = config;
