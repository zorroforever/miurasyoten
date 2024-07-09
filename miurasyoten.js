const puppeteer = require('puppeteer-core');
const express = require('express');
const winston = require('winston');
const moment = require('moment-timezone');
const path = require('path');
const DailyRotateFile = require('winston-daily-rotate-file');
const fs = require('fs');
const { exec } = require('child_process');
const config = require('./config');

const port = config.serverPort;
const projectName = config.projectName;

// log file format define
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level.toUpperCase()}] ${message}`;
});
// log file define
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => moment().tz("Asia/Shanghai").format('YYYY-MM-DD HH:mm:ss')
        }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        // console output.
        new winston.transports.Console(),
        // daily rotate file config.
        new DailyRotateFile({
            filename: `${projectName}-%DATE%.log`,
            dirname: path.join(`c:\\`, 'logs'), // dir
            datePattern: 'YYYY-MM-DD', // daily
            zippedArchive: true, // zip
            maxSize: '20m', // maxsize
            maxFiles: '14d', // max days
            auditFile: path.join(`c:\\`, 'logs', `${projectName}-audit.json`),
            format: winston.format.combine(
                winston.format.timestamp({
                    format: () => moment().tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss')
                }),
                logFormat
            )
        })
    ]
});

const app = express();
app.use(express.json());

const headLess = config.headless;
const appleLoginURL = config.appleLoginURL;
const appleDeviceURL = config.appleDeviceURL;
const loginUser = config.abmAccountName;
const loginPassword = config.abmAccountPassword;
const path2Chrome = config.path2Chrome;
const path2UserData = config.path2ChromeUserData;
const companyName = config.abmCompanyName;
const callBackApiURL = config.callBackApiURL;
const FAILED = config.responseFailed;
const SUCCESS = config.responseSuccess;
const abmAPIClientVersion = config.abmAPIClientVersion;
const apiVersion = config.apiVersion;
const mdmServerId = config.mdmServerId;
const apiDevicesForPagination = 'DevicesForPagination';
const apiAssignDevices = 'AssignDevices';
const apiExtendSession = 'ExtendSession';
const apiGetDeviceDetails = 'GetDeviceDetails';
const apiListMdmServers = 'ListMdmServers';
const apiMdmServerDeletionActivities = 'MdmServerDeletionActivities';
const apiCheckActivityProgress = 'CheckActivityProgress';
const apiGetLFSUStatus = 'GetLFSUStatus';
const loginMaxCount = 3;
const checkCountMax = 60;

let page;
let browser;
let loginCount = 0;
let sessionId = 'x5NSrl1tGGxzFisSHBHS3';
let cookies = '';
let client;
let checkCount = 1;
let isAuthorized = false;

/**
 * open chrome and get the page.
 * @returns {Promise<void>}
 */
async function connectToBrowser() {
     browser = await puppeteer.launch({
        executablePath : path2Chrome,
        headless: headLess,
        userDataDir: path2UserData,
        args: [
            '--useAutomationExtension=false',
            '--disable-gpu',
            '--disable-setuid-sandbox',
            '-–disable-dev-shm-usage',
            '--no-sandbox',
            '--no-zygote'
        ]
    });
    pages = await browser.pages();

    if (pages.length > 0) {
        page = pages[0];
    } else {
        page = await browser.newPage();
        await page.goto(appleLoginURL);
    }
}

/**
 * try to clear text on input
 * @param frame
 * @param selector
 * @returns {Promise<void>}
 */
async function clearInput(frame, selector) {
    const inputHandle = await frame.waitForSelector(selector);
    await inputHandle.focus();

    // Select all text inside the input field
    await frame.evaluate(selector => {
        const input = document.querySelector(selector);
        if (input) {
            input.select();
        }
    }, selector);

    // Alternatively, you can clear it by selecting all text and deleting
    await frame.evaluate(selector => {
        const input = document.querySelector(selector);
        if (input) {
            input.value = '';
        }
    }, selector);
}

/**
 * auto login ABM
 * @param page
 * @param loginUrl
 * @param username
 * @param password
 * @returns {Promise<void>}
 */
async function autoLogin(page, loginUrl, username, password) {
    logger.info('>>  Navigating to login page...');
    await page.goto(loginUrl); //aid-auth-widget
    const authFrameHandle = await page.waitForFrame(async frame => {
        return frame.name() === 'aid-auth-widget';
    });
    if (authFrameHandle) {
        // const ele_input_username_selector = '#account_name_text_field';
        const ele_input_password_selector = '#password_text_field';
        logger.info('>>  Login iframe found, navigating inside the iframe...');
        // we can save account name on browser,do not need to input
        // await authFrameHandle.waitForSelector(ele_input_username_selector);
        // await authFrameHandle.focus(ele_input_username_selector);
        // await clearInput(authFrameHandle,ele_input_username_selector);
        // await authFrameHandle.type(ele_input_username_selector, username, {delay: 100});
        // await authFrameHandle.waitForFunction(
        //     (selector, value) => document.querySelector(selector).value === value,
        //     {timeout: 5000},
        //     ele_input_username_selector,
        //     username
        // );

        await authFrameHandle.waitForSelector(ele_input_password_selector);
        await authFrameHandle.focus(ele_input_password_selector);
        await clearInput(authFrameHandle,ele_input_password_selector);
        await authFrameHandle.type(ele_input_password_selector, password, {delay: 100});
        // check the input.
        await authFrameHandle.waitForFunction(
            (selector, value) => document.querySelector(selector).value === value,
            {timeout: 5000},
            ele_input_password_selector,
            password
        );

        const ele_btn_sign_in_selector = '#sign-in';
        await authFrameHandle.waitForSelector(ele_btn_sign_in_selector);
        await authFrameHandle.click(ele_btn_sign_in_selector);
        logger.info('>>  Login successful!');
        isAuthorized = true;
    } else {
        logger.error('>> Login iframe not found!');
        throw new Error('Login iframe not found');
    }
}

/**
 * check current frame 2 ensure had login.
 * @param page
 * @returns {Promise<boolean>}
 */
async function checkLogin(page){
    try {
        const frameHandle = await page.waitForFrame(async frame => {
            return frame.name() === 'MainPortal';
        },{timeout:5000});
        if (frameHandle) {
            return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

/**
 * wait for element.
 * @param frame
 * @param selector
 * @param serialNumber
 * @param options
 * @param retries
 * @param markString
 * @returns {Promise<*>}
 */
async function waitForSelectorWithRetry(frame, selector, serialNumber, options = {}, retries = 3, markString) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // wait for selector
            return await frame.waitForSelector(selector, options);
        } catch (error) {
            if (attempt === retries) {
                throw new Error(`>>  Failed to find the serialNumber: ${serialNumber} after ${retries} attempts`);
            }
            logger.warn(`>>  Attempt count ${attempt} failed. Retrying...`);
            const ele_btn_search_selector = 'input[type="text"][placeholder="搜索"]';
            await clearSearch(frame, markString);
            await clearInput(frame, ele_btn_search_selector)
            await clearInput(frame, ele_btn_search_selector)
            await frame.type(ele_btn_search_selector, serialNumber, {delay: 500});
        }
    }
}

/**
 * search device on page.
 * @param frameHandle
 * @param markString
 * @param serial_number
 * @returns {Promise<boolean>}
 */
async function searchDevice(frameHandle, markString, serial_number){
    const ele_btn_search_selector = 'input[type="text"][placeholder="搜索"]'
    const inputHandle = await frameHandle.waitForSelector(ele_btn_search_selector,{timeout: 90000})
    if (inputHandle) {
        await clearInput(frameHandle, ele_btn_search_selector)
        await clearInput(frameHandle, ele_btn_search_selector)
        await frameHandle.type(ele_btn_search_selector, serial_number, {delay: 500});
        const ele_item_selector = `xpath/. //span[contains(text(), "${serial_number}")]`;
        const options = { visible: true, timeout: 9000 };
        await waitForSelectorWithRetry(frameHandle,ele_item_selector,serial_number, options,5, markString);
        await frameHandle.click(ele_item_selector);
        const ele_btn_mdm_name_selector = 'button.css-1armx2e[role="button"][type="button"]'
        await frameHandle.waitForSelector(ele_btn_mdm_name_selector, { visible: true });
        const buttonText = await frameHandle.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent.trim() : null;
        }, ele_btn_mdm_name_selector);

        if (buttonText) {
            if (buttonText === companyName) {
                return true;
            }
        } else {
            logger.info(`${markString}|Wrong MDM server`);
            return false;
        }
    }

}

/**
 * add device to MDM server.
 * @param page
 * @param serial_number
 * @param markString
 * @returns {Promise<{result: string, errMessage: string}|{result: string, errMessage: string}|{result: string|boolean, errMessage: string}|{result: string, errMessage: string}|{result: string, errMessage: string}|undefined>}
 */
async function addDeviceToMDM(page, serial_number, markString){
    if (apiVersion) {
        await initSessionAndCookie();
        logger.info(`${markString}|API version start ...`);
        return await assignDevice(markString, serial_number);
    } else {
        await ensureLogin();
        if (page.url() !== appleDeviceURL) {
            page.goto(appleDeviceURL);
        }
        const frameHandle = await page.waitForFrame(async frame => {
            return frame.name() === 'MainPortal';
        })
        if (frameHandle) {
            logger.info(`${markString}|Main iframe found, navigating inside the iframe...`);
            try {
                let res = await searchDevice(frameHandle, markString, serial_number);
                if (res){
                    logger.info(`${markString}|This device has successful put to the MDM server!!!`);
                    return {
                        result: SUCCESS,
                        errMessage: 'Device added complete.'
                    };
                }
                logger.info(`${markString}|Need for edit MDM server!!!`);
                // push the operator button.(3 point on the right)
                const ele_btn_op_selector = 'button.css-uglbp4[aria-label="操作"]'
                await frameHandle.waitForSelector(ele_btn_op_selector, { visible: true });
                await frameHandle.click(ele_btn_op_selector);
                logger.info(`${markString}|press button: operator ok.`);
                // push the edit mdm button.
                const ele_item_edit_mdm_selector = 'ui-menu-item[role="menuitem"][aria-label="编辑 MDM 服务器"]';
                await frameHandle.waitForSelector(ele_item_edit_mdm_selector, { visible: true });
                await frameHandle.click(ele_item_edit_mdm_selector);
                logger.info(`${markString}|press button: edit MDM server ok.`);
                // find the dialog window.
                const ele_h_title_selector = 'xpath/.//h6[text()="分配至以下 MDM："]';
                await frameHandle.waitForSelector(ele_h_title_selector, { visible: true });
                await frameHandle.click(ele_h_title_selector);
                const ele_btn_continue_selector = 'xpath/.//button[text()="继续" and @class="css-16rixhw"]';
                await frameHandle.waitForSelector(ele_btn_continue_selector, { visible: true });
                await frameHandle.click(ele_btn_continue_selector);
                logger.info(`${markString}|press button: continue ,edit MDM server ok.`);
                // push the Ok button.
                const ele_btn_confirm_selector = 'xpath/.//button[text()="确认" and @class="css-16rixhw"]';
                await frameHandle.waitForSelector(ele_btn_confirm_selector, { visible: true });
                await frameHandle.click(ele_btn_confirm_selector);
                logger.info(`${markString}|press button: confirm ,edit MDM server ok.`)
                // wait the activity complete.
                const ele_btn_complete_selector = 'xpath/.//button[text()="完成" and @class="css-1pawoxc"]';
                await frameHandle.waitForSelector(ele_btn_complete_selector, { visible: true });
                await frameHandle.click(ele_btn_complete_selector);
                logger.info(`${markString}|press button: complete ,edit MDM server ok.`)
                logger.info(`${markString}|This device has successful put to the MDM server!!!`);
                return {
                    result: SUCCESS,
                    errMessage: 'Device added complete.'
                };
            } catch (error) {
                logger.error(`${markString}|${error}`)
                return {
                    result: FAILED,
                    errMessage: `${error}`
                };
            }
        }
    }
    logger.info(`${markString}|Device added failed.`);
    return {
        result: FAILED,
        errMessage: `Device added failed.`
    };
}

/**
 * click the clear button on input box.
 * @param frameHandle
 * @param markString
 * @returns {Promise<void>}
 */
async function clearSearch(frameHandle,markString){
    try {
        const ele_btn_clear_selector = 'xpath/.//button[@aria-label="清除搜索内容" and @class="css-fb97us"]';
        await frameHandle.waitForSelector(ele_btn_clear_selector, {visible: true,timeout: 1000});
        await frameHandle.click(ele_btn_clear_selector);
    } catch (e) {
        logger.warn(`${markString}|Device search clear failed.`);
    }
}

/**
 * make the response.
 * @param res
 * @param recordId
 * @param rpaResult
 * @param rpaErrMessage
 * @returns {*}
 */
function makeResponse(res,recordId,rpaResult,rpaErrMessage){
    let code = 200;
    let success = 'True';
    let errCode = "0000";
    if (rpaResult === FAILED) {
        code = 500;
        success = "False";
        errCode = "9999";
    }
    return res.status(code).send({
        'errMessage': rpaErrMessage,
        'result': {'id': recordId, 'rpaResult': rpaResult, 'message': rpaErrMessage},
        'success': success,
        'errCode': errCode,
    });
}

/**
 * send call back.
 * @param markString
 * @param prefix
 * @param paramString
 * @returns {Promise<void>}
 */
async function sendCallbackRequest(markString,prefix,paramString) {
    try {
        const url = `${prefix}${callBackApiURL}`;
        const ua = 'miurasyoten/1.0.0';
        const myHeaders = new Headers();
        myHeaders.append("User-Agent", ua);
        const formdata = new FormData();
        formdata.append("param", paramString);
        logger.info(`${markString}|url=${url}`);
        logger.info(`${markString}|param=${paramString}`);
        const requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: formdata,
            redirect: 'follow'
        };

        fetch(url, requestOptions)
            .then(response => response.text())
            .then(result => logger.info(`${markString}|call back success:${result}`))
            .catch(error => logger.error(`${markString}|${error}`));
    } catch (error) {
        logger.info(`${markString}|Error sending callback request:${error}`);
    }
}

/**
 * ABM api:extendSession
 * @param markString
 * @param sessionId
 * @param cookies
 * @returns {Promise<string>}
 */
async function extendSession(markString, sessionId, cookies){
    const body = `{"operationName":"ExtendSession","variables":{},"query":"mutation ExtendSession {\\n  extendSession {\\n    __typename\\n  }\\n}"}`;
    return await gql(markString,apiExtendSession,sessionId,cookies,body);
}

/**
 * ABM api:devicesForPagination
 * @param markString
 * @param sessionId
 * @param cookies
 * @param serialNumber
 * @returns {Promise<string>}
 */
async function devicesForPagination(markString, sessionId, cookies, serialNumber){
    const body = {
        "operationName": "DevicesForPagination",
        "variables": {
            "search": `${serialNumber}`,
            "limit": 350,
            "sortFields": [
                {
                    "name": "DATE_CREATED",
                    "order": "DESC"
                }
            ],
            "start": 0
        },
        "query": "query DevicesForPagination($filters: DevicesFilterInput, $ids: [String!], $limit: Int, $search: String, $sortFields: [DevicesSortInput!], $start: Int) {\n  deviceSearch: paginatedDeviceSearch(\n    inputV2: {filters: $filters, ids: $ids, limit: $limit, search: $search, sortFields: $sortFields, start: $start}\n  ) {\n    nodes {\n      ...DevicesInPagination\n      __typename\n    }\n    sessionTag\n    totalCount\n    __typename\n  }\n}\n\nfragment AssignedUserNameForDevice on DeviceSearchInfo {\n  firstName\n  middleName\n  lastName\n  __typename\n}\n\nfragment DevicesInPagination on Device {\n  id\n  name\n  searchInfo {\n    id\n    serial\n    virtualSerialNumber\n    iconProductFamily\n    iconProductInfo\n    productFamily\n    isAxmManaged\n    status\n    currentMdmServer {\n      id\n      name\n      __typename\n    }\n    isPendingApproval\n    issues\n    ...AssignedUserNameForDevice\n    __typename\n  }\n  __typename\n}"
    };
    return await gql(markString,apiDevicesForPagination,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:devicesForPaginationDesc(order by DATE_CREATED desc)
 * @param markString
 * @param sessionId
 * @param cookies
 * @returns {Promise<string>}
 */
async function devicesForPaginationDesc(markString, sessionId, cookies){
    const body =  {
        "operationName": "DevicesForPagination",
        "variables": {
            "limit": 350,
            "sortFields": [
                {
                    "name": "DATE_CREATED",
                    "order": "DESC"
                }
            ],
            "start": 0
        },
        "query": "query DevicesForPagination($filters: DevicesFilterInput, $ids: [String!], $limit: Int, $search: String, $sortFields: [DevicesSortInput!], $start: Int) {\n  deviceSearch: paginatedDeviceSearch(\n    inputV2: {filters: $filters, ids: $ids, limit: $limit, search: $search, sortFields: $sortFields, start: $start}\n  ) {\n    nodes {\n      ...DevicesInPagination\n      __typename\n    }\n    sessionTag\n    totalCount\n    __typename\n  }\n}\n\nfragment AssignedUserNameForDevice on DeviceSearchInfo {\n  firstName\n  middleName\n  lastName\n  __typename\n}\n\nfragment DevicesInPagination on Device {\n  id\n  name\n  searchInfo {\n    id\n    serial\n    virtualSerialNumber\n    iconProductFamily\n    iconProductInfo\n    productFamily\n    isAxmManaged\n    status\n    currentMdmServer {\n      id\n      name\n      __typename\n    }\n    isPendingApproval\n    issues\n    ...AssignedUserNameForDevice\n    __typename\n  }\n  __typename\n}"
    };
    return await gql(markString,apiDevicesForPagination,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:getDeviceDetails
 * @param markString
 * @param sessionId
 * @param cookies
 * @param serialNumber
 * @returns {Promise<string>}
 */
async function getDeviceDetails(markString, sessionId, cookies, serialNumber){
    const body = {
        "operationName": "GetDeviceDetails",
        "variables": {
            "serial": `${serialNumber}`
        },
        "query": "query GetDeviceDetails($serial: String!) {\n  device(serial: $serial) {\n    id\n    isAxmManaged\n    isDEPReleased\n    name\n    activationLockStatus {\n      isLocked\n      lockType\n      __typename\n    }\n    searchInfo {\n      id\n      serial\n      deviceName\n      productFamily\n      iconProductFamily\n      iconProductInfo\n      marketingName\n      status\n      currentMdmServer {\n        id\n        name\n        type\n        __typename\n      }\n      isAxmManaged\n      isAvailableForSubscription\n      issues\n      ...AssignedUserNameForDevice\n      isPendingApproval\n      virtualSerialNumber\n      repairRequestId\n      incidentStatus\n      isApplecareEligible\n      __typename\n    }\n    depInfo {\n      serial\n      purchaseInfo {\n        reseller {\n          id\n          name\n          __typename\n        }\n        source\n        orderNumber\n        __typename\n      }\n      createdAt\n      updatedAt\n      updatedByUser {\n        id\n        ...UserName\n        __typename\n      }\n      deviceCapacity\n      partNumber\n      mdmServerUpdatedAt\n      dateReleasedFromDep\n      faceTimeUser {\n        id\n        maid\n        ...UserName\n        roles {\n          role {\n            id\n            __typename\n          }\n          location {\n            id\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      hrnStatus {\n        mode\n        isEnabled\n        __typename\n      }\n      productType\n      __typename\n    }\n    mdmInfo {\n      id\n      lastCheckIn\n      serial\n      marketingName\n      deviceName\n      osVersion\n      osBuild\n      modelName\n      model\n      productName\n      platform\n      softwareUpdateEnforcementDetails {\n        enforcementState\n        targetVersion\n        enforcementDate\n        deferredUntilDate\n        deliveredAt\n        source\n        configId\n        __typename\n      }\n      diskUsage {\n        percentUsed\n        freeCapacity\n        totalCapacity\n        __typename\n      }\n      imei\n      meid\n      isSupervised\n      isDeviceLocatorServiceEnabled\n      isActivationLockSupported\n      isActivationLockEnabled\n      isDoNotDisturbInEffect\n      isCloudBackupEnabled\n      lastCloudBackupDate\n      hostName\n      macAddresses {\n        bluetooth\n        ethernet\n        wifi\n        __typename\n      }\n      phoneNumber\n      carrier\n      isFirewallEnabled\n      isFileVaultEnabled\n      virtualSerialNumber\n      escrowedFileVaultKey {\n        certSerialNumber\n        certCommonName\n        __typename\n      }\n      mdmLostMode {\n        status\n        enableRequestedAt\n        disableRequestedAt\n        playSoundRequestedAt\n        __typename\n      }\n      deviceLock {\n        status\n        requestedAt\n        pin\n        __typename\n      }\n      deviceErase {\n        status\n        requestedAt\n        pin\n        __typename\n      }\n      enrollmentId\n      enrollmentMode\n      assignedUser {\n        id\n        ...UserName\n        __typename\n      }\n      assignedApps {\n        nodes {\n          id\n          isCustomPackage\n          customPackageMetadata {\n            id\n            name\n            supportedOperatingSystems\n            iconUrlTemplate\n            __typename\n          }\n          metadataV2 {\n            name\n            supportedOperatingSystems\n            thumbnailTemplate\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      assignedSettings {\n        edges {\n          node {\n            id\n            name\n            setting {\n              id\n              __typename\n            }\n            __typename\n          }\n          status\n          __typename\n        }\n        __typename\n      }\n      pinRequiredForEraseDevice\n      __typename\n    }\n    subscriptions {\n      edges {\n        isActive\n        status\n        node {\n          id\n          plan {\n            ...PlanInfo\n            __typename\n          }\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    pendingEnrollments {\n      nodes {\n        serial\n        enrollmentId\n        certFingerprint\n        os\n        enrolledAt\n        __typename\n      }\n      totalCount\n      __typename\n    }\n    __typename\n  }\n}\n\nfragment AssignedUserNameForDevice on DeviceSearchInfo {\n  firstName\n  middleName\n  lastName\n  __typename\n}\n\nfragment UserName on User {\n  firstName\n  middleName\n  lastName\n  inadequateUserType\n  __typename\n}\n\nfragment PlanInfo on Plan {\n  id\n  type\n  price\n  hasStorage\n  partNumber\n  storageDetails {\n    quotaMB\n    __typename\n  }\n  appleCareDetails {\n    incidentsPerLicense\n    __typename\n  }\n  hasAppleCare\n  devicesPerLicense\n  hasDeviceManagement\n  hasUserManagement\n  priority\n  __typename\n}"
    };
    return await gql(markString,apiGetDeviceDetails,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:listMdmServers
 * @param markString
 * @param sessionId
 * @param cookies
 * @returns {Promise<string>}
 */
async function listMdmServers(markString, sessionId, cookies){
    const grapql = 'query ListMdmServers {organization {id __typename} mdmServers {nodes {id __typename} __typename}}';
    const variables = {};
    const body = {
        "operationName":`${apiListMdmServers}`,
        "variables": variables,
        "query":`${grapql}`
    };
    // response example
    // {
    //     "data": {
    //     "organization": {
    //         "id": "1111111111111111",       //organization id
    //             "subscriptionStatus": null,
    //             "__typename": "Organization"
    //     },
    //     "mdmServers": {
    //         "nodes": [
    //             {
    //                 "id": "E6FF5F97BD5B48C5901E332013695C96",
    //                 "name": "Devices Added by Apple Configurator 2",
    //                 "type": "CUSTOMER_ENROLLMENT",
    //                 "assignedDevicesCount": 34,
    //                 "defaultProductFamiliesV2": [],
    //                 "__typename": "MDMServer"
    //             },
    //             {
    //                 "id": "61F3D7A562AC4DE396DEC294ABBF1BE4",     // assign to mdm server id
    //                 "name": "XXX有限公司",
    //                 "type": "REGULAR",
    //                 "assignedDevicesCount": 9999,
    //                 "defaultProductFamiliesV2": [
    //                     "APPLE_TV",
    //                     "IPAD",
    //                     "IPHONE",
    //                     "MAC",
    //                     "IPOD"
    //                 ],
    //                 "__typename": "MDMServer"
    //             }
    //         ],
    //             "__typename": "MdmServerCollection"
    //     }
    // }
    // }
    return await gql(markString,apiListMdmServers,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:mdmServerDeletionActivities
 * @param markString
 * @param sessionId
 * @param cookies
 * @returns {Promise<string>}
 */
async function mdmServerDeletionActivities(markString, sessionId, cookies){
    const body = {
        "operationName": "MdmServerDeletionActivities",
        "variables": {
            "filters": {
                "Operation": [
                    "REASSIGN_AND_DELETE",
                    "UNASSIGN_AND_DELETE"
                ],
                "Status": [
                    "IN_PROGRESS"
                ]
            },
            "limit": 350,
            "sortFields": [
                {
                    "name": "DATE_COMPLETED",
                    "order": "DESC"
                }
            ],
            "start": 0
        },
        "query": "query MdmServerDeletionActivities($filters: ActivitiesFilterInput, $limit: Int, $sortFields: [ActivitiesSortInput!], $start: Int) {\n  activitiesSearch: paginatedActivitySearch(\n    input: {filters: $filters, limit: $limit, sortFields: $sortFields, start: $start}\n  ) {\n    nodes {\n      __typename\n      id\n      originalRequestJSON\n      ...ActivityListItemInfo\n    }\n    __typename\n  }\n}\n\nfragment ActivityIconInfo on Activity {\n  failureCount\n  operationType\n  percentComplete\n  status\n  subStatus\n  totalCount\n  type\n  __typename\n}\n\nfragment ActivitySubtitleInfo on Activity {\n  id\n  dateCompleted\n  dateUpdated\n  operationType\n  status\n  subStatus\n  type\n  totalCount\n  completedCount\n  __typename\n}\n\nfragment ActivityTitleInfo on Activity {\n  id\n  domainName\n  operationType\n  successCount\n  status\n  subStatus\n  totalCount\n  dataSource {\n    id\n    type\n    name\n    __typename\n  }\n  __typename\n}\n\nfragment ActivityInProgressPollingInfo on Activity {\n  dateCreated\n  status\n  subStatus\n  __typename\n}\n\nfragment ActivityListItemInfo on Activity {\n  isUnread\n  operationType\n  status\n  ...ActivityIconInfo\n  ...ActivitySubtitleInfo\n  ...ActivityTitleInfo\n  ...ActivityInProgressPollingInfo\n  __typename\n}"
    };
    // response example:
    // {
    //     "data": {
    //     "activitiesSearch": {
    //         "nodes": [],
    //             "__typename": "PaginatedActivitySearchResponse"
    //     }
    // }
    // }
    return await gql(markString,apiMdmServerDeletionActivities,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:assignDevices
 * @param markString
 * @param sessionId
 * @param cookies
 * @param serialNumber
 * @returns {Promise<string>}
 */
async function assignDevices(markString, sessionId, cookies, serialNumber){
    const body = {
        "operationName": "AssignDevices",
        "variables": {
            "input": {
                "targetServerUid": `${mdmServerId}`,
                "search": `${serialNumber}`,
                "selectedIds": [
                    `${serialNumber}`
                ]
            }
        },
        "query": "mutation AssignDevices($input: AssignDevicesBatchActionInput!) {\n  batchAction: assignDevices(input: $input) {\n    activity {\n      id\n      __typename\n    }\n    __typename\n  }\n}"
    };
    // response example:
    // {
    //     "data": {
    //     "batchAction": {
    //         "activity": {
    //             "id": "509efe94-bf1a-4066-9626-e535ceeaf3c2",   // activity id.
    //                 "__typename": "Activity"
    //         },
    //         "__typename": "AssignDevicesPayload"
    //     }
    // }
    // }
    return await gql(markString,apiAssignDevices,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:checkActivityProgress
 * @param markString
 * @param sessionId
 * @param cookies
 * @param activityId
 * @returns {Promise<string>}
 */
async function checkActivityProgress(markString, sessionId, cookies, activityId){
    const body = {
        "operationName": "CheckActivityProgress",
        "variables": {
            "id": `${activityId}`
        },
        "query": "query CheckActivityProgress($id: ID!) {\n  activity(id: $id) {\n    id\n    ...ActivityProgressInfo\n    __typename\n  }\n}\n\nfragment ActivityInProgressPollingInfo on Activity {\n  dateCreated\n  status\n  subStatus\n  __typename\n}\n\nfragment ActivityProgressInfo on Activity {\n  isStoppable\n  percentComplete\n  status\n  ...ActivityInProgressPollingInfo\n  __typename\n}"
    };
    return await gql(markString,apiCheckActivityProgress,sessionId,cookies,JSON.stringify(body));
}

/**
 * ABM api:getLFSUStatus
 * @param markString
 * @param sessionId
 * @param cookies
 * @returns {Promise<string>}
 */
async function getLFSUStatus(markString, sessionId, cookies){
    const body = {
        "operationName": "GetLFSUStatus",
        "variables": {},
        "query": "query GetLFSUStatus {\n  organization {\n    id\n    enrollmentPhase\n    enrollmentProvisional\n    provisionalTrialEndTime\n    __typename\n  }\n  orgPaymentGroupAccount: orgPaymentGroupAccountV2 {\n    ... on OrgPaymentGroupAccount {\n      isInFreeTrialPeriod\n      trialPeriodEndDate\n      timeZoneId\n      __typename\n    }\n    __typename\n  }\n}"
    };
    return await gql(markString,apiGetLFSUStatus,sessionId,cookies,JSON.stringify(body));
}
async function gql(markString, apiCode, sessionId, cookies, gql){
    const url = `https://ws.business.apple.com/mdm/api/graphql?operation=${apiCode}&clientName=MainPortal&clientVersion=${abmAPIClientVersion}&sessionID=${sessionId}`;
    logger.info(`${markString}|apiCode=${apiCode}==================================================`);
    const acn01 = cookies.find(cookie => cookie.name === 'acn01').value;
    const myacinfo = cookies.find(cookie => cookie.name === 'myacinfo').value;
    const apple_eesession = cookies.find(cookie => cookie.name === 'apple_eesession').value;
    const cookie = `dslang=CN-ZH; site=CHN; geo=CN; acn01=${acn01}; myacinfo=${myacinfo}; apple_eesession=${apple_eesession}`;
    const myHeaders = new Headers();
    myHeaders.append("accept", "*/*");
    myHeaders.append("accept-language", "zh-hans-cn, zh-cn");
    myHeaders.append("origin", "https://business.apple.com");
    myHeaders.append("priority", "u=1, i");
    myHeaders.append("referer", "https://business.apple.com/");
    myHeaders.append("sec-ch-ua", "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"");
    myHeaders.append("sec-ch-ua-mobile", "?0");
    myHeaders.append("sec-ch-ua-platform", "\"Windows\"");
    myHeaders.append("sec-fetch-dest", "empty");
    myHeaders.append("sec-fetch-mode", "cors");
    myHeaders.append("sec-fetch-site", "same-site");
    myHeaders.append("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
    myHeaders.append("Cookie", cookie);
    myHeaders.append("content-type", "text/plain");
    myHeaders.append("Host", "ws.business.apple.com");
    myHeaders.append("Connection", "keep-alive");

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: gql,
        redirect: 'follow'
    };

    try {
        const response = await fetch(url, requestOptions);
        const result = await response.text();
        logger.info(`${markString}|result=${result}`);
        // if login out ,get new cookies.
        if (result && result.includes('Unauthorized')) {
            loginCount += 1;
            if (loginCount > loginMaxCount) {
                return result;
            }
            await initSessionAndCookie();
            await gql(markString, apiCode, sessionId, cookies, gql);
        }
        return result;
    } catch (error) {
        logger.info(`${markString}|error=${error}`);
        throw error;
    }
}

/**
 * get session id for url.
 * @param url
 * @returns {string}
 */
function extractSessionID(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('sessionID');
}

/**
 * init new login,and get the session and cookies.
 * @returns {Promise<void>}
 */
async function initSessionAndCookie(){
    await ensureLogin();
    client = await page.target().createCDPSession();
    cookies = (await client.send('Network.getAllCookies')).cookies;
    fs.writeFileSync('business-apple-all-cookies.json',  JSON.stringify(cookies));

    page.on('request', async request => {
        const url = request.url();
        const method = request.method();
        const postData = request.postData();
        if (method === 'POST' && url.includes('sessionID')) {
            logger.debug(`listen|Request URL: ${url}`);
            logger.debug(`listen|Request Method: ${method}`);
            logger.debug(`listen|Request Payload: ${postData}`);
            const currentSessionId = extractSessionID(url);
            if (currentSessionId !== sessionId) {
                logger.info(`login session id changed:from|${sessionId}|to|${currentSessionId}|`);
                sessionId = currentSessionId;
            }
        }
    });
    page.on('response', async response => {
        const request = response.request();
        const url = request.url();
        const status = response.status();

        if (response.url().includes('sessionID')) {
            logger.debug(`Response URL: ${url}`);
            logger.debug(`Response Status: ${status}`);
            const responseText = await response.text();
            logger.debug(`Response Text for sessionID: ${responseText}`);
            const currentSessionId = extractSessionID(url);
            if (currentSessionId !== sessionId) {
                logger.info(`login session id changed:from|${sessionId}|to|${currentSessionId}|`);
                sessionId = currentSessionId;
            }
        }
    });
}
let checkDeviceCount = 1;
const checkDeviceCountMax = 6;

/**
 * check the device has assigned 2 ABM
 * @param markString
 * @param sessionId
 * @param cookies
 * @param serialNumber
 * @returns {Promise<{success: boolean, message: `${string}|checkDeviceHasAssigned2Apple${string}`}|{needReturn: boolean, success: string, message: `${string}|can not find device|${string}| on ABM.`}|{needReturn: boolean, success: string, message: `${string}|current device had assigned to mdm.`}|{needReturn: boolean, success: string, message: string}|*|undefined>}
 */
async function checkDeviceHasAssigned2Apple(markString, sessionId, cookies,serialNumber){
    let message = '';
    try {
        const r = await getDeviceDetails(markString, sessionId, cookies, serialNumber);
        const currentMdmServerId = JSON.parse(r)?.data?.device?.searchInfo?.currentMdmServer?.id;
        if (currentMdmServerId) {
            logger.info(`${markString}|currentMdmServerId=${currentMdmServerId}`)
            if (currentMdmServerId !== mdmServerId) {
                return {
                    success: SUCCESS,
                    message: message,
                    needReturn: false
                }
            } else {
                message = `${markString}|current device had assigned to mdm.`;
                logger.info(message);
                return {
                    success: SUCCESS,
                    message: message,
                    needReturn: true
                }
            }
        }
        checkDeviceCount += 1;
        if (checkDeviceCount >= checkDeviceCountMax) {
            message = `${markString}|can not find device|${serialNumber}| on ABM.`;
            logger.warn(message);
            return {
                success: FAILED,
                message: message,
                needReturn: true
            }
        }
        await new Promise(resolve => setTimeout(resolve, 8000));
        return await checkDeviceHasAssigned2Apple(markString, sessionId, cookies, serialNumber);
    } catch (e) {
        message = `${markString}|checkDeviceHasAssigned2Apple${e}`;
        logger.error(message);
        return {
            success: false,
            message: message
        }
    }

}

/**
 * process 2 assign device 2 ABM.
 * @param markString
 * @param serialNumber
 * @returns {Promise<{result: string, errMessage: string}|{result: (boolean|string|*), errMessage: (`${string}|checkDeviceHasAssigned2Apple${string}`|`${string}|can not find device|${string}| on ABM.`|`${string}|current device had assigned to mdm.`|string|*)}>}
 */
async function assignDevice(markString, serialNumber){
    logger.info(`Processing API =${serialNumber} request after session extended.`);
    if (cookies === '') {
        return {
            result: FAILED,
            errMessage: `session is not ready!!!`
        };
    }
    try {
        await extendSession(markString, sessionId, cookies);
        checkDeviceCount = 0;
        const checkDevice = await checkDeviceHasAssigned2Apple(markString, sessionId, cookies,serialNumber);
        if (checkDevice && checkDevice.needReturn) {
            return {
                result: checkDevice.success,
                errMessage: checkDevice.message
            }
        }
        // default manual step
        // step 1
        // await devicesForPagination(markString, sessionId, cookies, serialNumber);
        // step 2
        // await getDeviceDetails(markString, sessionId, cookies, serialNumber);
        // step 3
        // await listMdmServers(markString, sessionId, cookies);
        // step 4
        // await mdmServerDeletionActivities(markString, sessionId, cookies);
        const r = await assignDevices(markString, sessionId, cookies, serialNumber);
        const activityId = JSON.parse(r)?.data?.batchAction?.activity?.id;
        if (activityId) {
            checkCount = 0;
            const checkResult = await checkActivityProcess(markString, sessionId, cookies, activityId);
            if (checkResult) {
                await getLFSUStatus(markString, sessionId, cookies);
            }
        }
        return {
            result: SUCCESS,
            errMessage: 'Device added complete.'
        };
    } catch (error) {
        logger.error(error);
        return {
            result: FAILED,
            errMessage: `${error}`
        };
    }
}

/**
 * check the acitivity has complete.
 * @param markString
 * @param sessionId
 * @param cookies
 * @param activityId
 * @returns {Promise<*|undefined|boolean>}
 */
async function checkActivityProcess(markString, sessionId, cookies, activityId){
    try {
        const cap = await checkActivityProgress(markString, sessionId, cookies, activityId);
        if (cap) {
            if (JSON.parse(cap).data.activity.status === 'IN_PROGRESS') {
                checkCount += 1;
                if (checkCount >= checkCountMax) {
                    return true;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
                return await checkActivityProcess(markString, sessionId, cookies, activityId);
            }
        }
    } catch (e) {
        logger.error(`${markString}|checkActivityProcess error,apple assign server may done!!!`);
        return false;
    }
}

/**
 * kill the chrome on mem.
 * @returns {Promise<unknown>}
 */
async function killAllChromeProcesses() {
    return new Promise((resolve, reject) => {
        // 对于 Windows 系统
        const command = 'taskkill /F /IM chrome.exe /T';
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

/**
 * ensure the page had login.
 * @returns {Promise<*|null>}
 */
async function ensureLogin(){
    try {
        logger.info('###|ensureLogin start!');
        isAuthorized = true;
        isAuthorized = await checkLogin(page);
        if (!isAuthorized){
            if (sessionId !== 'x5NSrl1tGGxzFisSHBHS3') {
                await killAllChromeProcesses();
                await connectToBrowser();
            }
            logger.info('>>  Not logged in, performing login...');
            await autoLogin(page, appleLoginURL, loginUser, loginPassword);
            logger.info(`>>  Navigating to the target page...${appleDeviceURL}`);
            // page.goto(appleDeviceURL);
        }
        logger.info('###|ensureLogin successfully!');
        return await page.waitForFrame(async frame => {
            return frame.name() === 'MainPortal';
        });
    } catch (error) {
        logger.error(`Failed to ensureLogin:${error}`);
    }
    return null;
}

/**
 * miurasyotenn API:assign device.
 */
app.get('/assignDevice', async (req, res) => {
    try {
        const { serialNumber } = req.query;
        const r = await assignDevice(serialNumber);
        return res.status(200).send({
            'errMessage': r.errMessage,
            'result': r.result,
            'success': true,
            'errCode': 0,
        });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});
/**
 * miurasyotenn API:assign device and callback.
 */
app.get('/assignDeviceAndCallBack', async (req, res) => {
    try {
        logger.info('Processing API request after session extended.');
        const startTime = Date.now();
        const { serial_number, app_id, record_id, callback_base_url } = req.query;
        let rpaResult = SUCCESS;
        let rpaErrMessage = '';

        if (!serial_number || !app_id) {
            rpaResult = FAILED;
            rpaErrMessage = 'Missing serialNumber or app_id';
            return makeResponse(res,record_id,rpaResult,rpaErrMessage);
        }
        if (!record_id || !callback_base_url) {
            rpaResult = FAILED;
            rpaErrMessage = 'Missing record_id or callback_base_url';
            return makeResponse(res,record_id,rpaResult,rpaErrMessage);
        }
        const markString = `${app_id}|${serial_number}|${record_id}`;

        try {
            logger.info(`${markString}|Received request to add device.`);
            const r = await addDeviceToMDM(page, serial_number, markString);
            rpaResult = r.result;
            rpaErrMessage = r.errMessage;
            return makeResponse(res,record_id,rpaResult,rpaErrMessage);
        } catch (error) {
            logger.error(`${markString}|Failed to add device: ${error}`);
            rpaResult = FAILED;
            rpaErrMessage = `${error}`;
            return makeResponse(res,record_id,rpaResult,rpaErrMessage);
        } finally {
            // 计时
            const endTime = Date.now();
            const duration = endTime - startTime;
            logger.info(`${markString}|@@@assignDeviceAndCallBack executed in ${duration}ms`);
            rpaErrMessage = rpaErrMessage.replace(/"/g, "'");
            // 在 finally 中调用异步回调函数
            let param = `{"id": "${record_id}", "rpaResult": "${rpaResult}", "message": "${rpaErrMessage}"}`
            sendCallbackRequest(markString,callback_base_url,param).then(() => {
                logger.info(`${markString}|Callback request sent.`);
            }).catch(error => {
                logger.error(`${markString}|Error in callback request:${error}`);
            });
        }

    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Internal Server Error');
    }
});
/**
 * miurasyotenn API:send graphQL the ABM.
 */
app.get('/makeGql', async (req, res) => {
    const { serialNumber,apiCode,gqlQuery } = req.query;
    const markString = 'makeGql';
    await initSessionAndCookie();
    await gql(markString, apiCode, sessionId, cookies, gqlQuery)
        .then(result => {
            logger.info(result);
            return res.status(200).send({
                'errMessage': '',
                'result':`${result}`,
                'success': true,
                'errCode': 0,
            });
        })
        .catch(error => {
            logger.info('Error:', error);
            return res.status(200).send({
                'errMessage': '',
                'result':`${error}`,
                'success': false,
                'errCode': -1,
            });
        });
});
/**
 * miurasyotenn API:health check
 */
app.get('/health', async (req, res) => {
    return res.status(200).send({
        'errMessage': '',
        'result':`ok`,
        'success': true,
        'errCode': 0,
    });
});
/**
 * start the http server
 */
app.listen(port, async () => {
    // open chrome and get the cookies.
    await connectToBrowser();
    await initSessionAndCookie();
    logger.info(`Server listening on port ${port}`);
});
