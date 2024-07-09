<p align="center">
 <img width="100px" src="/docs/apple.svg" align="center" alt="miurasyoten" />
 <h2 align="center">「Miurasyoten？」</h2>
 <p align="center">Apple Business Management automatically adds devices to your MDM server.</p>
 <p align="center">
    <a href="https://github.com/zorroforever/miurasyoten/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/zorroforever/miurasyoten" />
    </a>
    <a href="https://github.com/zorroforever/miurasyoten/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/zorroforever/miurasyoten?color=0088ff" />
    </a>
    <a href="https://github.com/zorroforever/miurasyoten/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/zorroforever/miurasyoten?color=0088ff" />
    </a>
    <br />
    <br />
  </p>
 <p align="center">
    <a href="/docs/readme_zh.md">中国语 </a>
    ·
    <a href="/docs/readme_ja.md">日本語</a>
  </p>
 </p>

## Background

Need to automatically add apple devices added with Apple Configurator 2 to your own MDM server for management. This avoids the tedious manual addition.
The usual steps are:
```
1. Open the device page.
2. Enter the serial number in the search box.
3. Click on the search result to display the device details on the right.
4. Click the button on the top right of the details to select Edit MDM Server.
5. Select the MDM server you want to assign and confirm.
6. Wait for the progress bar to complete and click Finish.
```

This program implements two solutions: automating manual operations and directly calling Apple's interfaces (configured through a configuration file).
> [!NOTE]\
* For the first login, you need to manually log in, enter the verification code, and save this device. This way, the next time you open it, you only need to automatically enter the password to log in without entering the mobile verification code.  
* This program is based on the Chinese system of Apple's Business Management System. Other systems need to modify the browser head settings, etc.

## Getting Started

Prepare a normal node environment. (I use the latest version)
```
node -v
```

## Installation

1. Install dependencies.
   Execute the following commands.
    ```
    npm install async-lock
    npm install express
    npm install moment-timezone
    npm install puppeteer-core
    npm install winston
    npm install winston-daily-rotate-file
    ```

2. Configure config.json

    ```
    {
      "projectName": "miurasyoten",
      "serverPort": 1234,
      "headless": true,     // Headless mode switch
      "appleLoginURL": "https://business.apple.com/",
      "appleDeviceURL": "https://business.apple.com/#/main/devices",
      "abmAccountName": "",  // ABM account
      "abmAccountPassword": "", // ABM password
      "path2Chrome": "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", // Chrome installation path
      "path2ChromeUserData": "D:\\\\profile", // Chrome user data file path
      "callBackApiURL": "/abc/callBack", // Callback URL
      "abmCompanyName": "xxx company", // MDM server company name
      "abmAPIClientVersion": "2418B35", // ABM client version number
      "mdmServerId": "61F3D7A562AC4DE396DEC294ABBF1BE4", // MDM server ID
      "apiVersion": true, // Enable pure ABM interface call version switch
      "responseSuccess": "2", 
      "responseFailed": "3"
    }
    ```
> [!NOTE]\
* The Chrome user data file path must correspond to a folder for each account to save the account and device information.  
* The MDM server ID corresponds to the company name of the MDM server you want to assign and can be obtained from the ABM-API's listMdmServers interface.  
* The apiVersion can switch between two implementations, the interface call version, and the page simulation operation version.

3. ABM-API
    <details>
    <summary>Interfaces</summary>

   > 1. extendSession Extend session time?
   > 2. devicesForPagination Search devices by serial number with pagination
   > 3. devicesForPaginationDesc Search devices by creation time in descending order with pagination
   > 4. getDeviceDetails Get device details by serial number
   > 5. listMdmServers Get the list of MDM servers
   > 6. mdmServerDeletionActivities Get the MDM server allocation status
   > 7. assignDevices Assign devices to MDM servers
   > 8. checkActivityProgress Check assignment progress
   > 9. getLFSUStatus Get LFS status?

     </details>

4. miurasyoten External Interfaces
   <details>
    <summary>Interfaces</summary>

   > 1. assignDevice Assign device
   > 2. assignDeviceAndCallBack Assign device and callback
   > 3. makeGql Build graphQL to query ABM database
   > 4. health Health check

     </details>
## Contribution

..

## Version

..

## Author

* **haruka.moe** - *Initial work* - [miurasyoten](https://github.com/miurasyoten)


## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Acknowledgments

* Inspiration
* Others
