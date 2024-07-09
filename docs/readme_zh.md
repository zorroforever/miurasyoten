<p align="center">
 <img width="100px" src="/docs/apple.svg" align="center" alt="miurasyoten" />
 <h2 align="center">「三浦書店？」</h2>
 <p align="center">apple商务管理自动添加设备到自己的MDM服务器。</p>
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
    <a href="/docs/readme_en.md">English </a>
    ·
    <a href="/docs/readme_ja.md">日本語</a>
  </p>
 </p>

## 缘起

需要自动可以添加用Apple Configurator 2添加的apple设备到自己的mdm服务器来管控。这样就可以不用人工很累的手动添加。
通常步骤是：
```
1. 打开设备页面。
2. 在搜索框输入序列号。
3. 点击搜索结果在右边出现设备详情。
4. 点击详情右上角的按钮选择编辑mdm服务器。
5. 选择自己想要分配的mdm服务器，确定。
6. 等待进度条走完，点击完成。  
```

本程序实现了手工操作的自动化和直接调用apple的接口的2种方案。（通过配置文件设置）
> [!NOTE]\
    * 首次登录需要手动登录输入验证码，并且保存本设备，这样再次打开就只要自动输入密码就能登录不用输入手机验证码。  
    * 本程序基于中文系统的apple商务管理系统，其他系统需要修改浏览器head设置等。   

## 开始


准备一个正常的node环境。（我用的最新版）
```
node -v
```

## 安装

1. 安装依赖。
    执行以下命令。
    ```
    npm install async-lock
    npm install express
    npm install moment-timezone
    npm install puppeteer-core
    npm install winston
    npm install winston-daily-rotate-file
    ```

2. 配置config.json

    ```
    {
      "projectName": "miurasyoten",
      "serverPort": 1234,
      "headless": true,     // 无头模式开关
      "appleLoginURL": "https://business.apple.com/",
      "appleDeviceURL": "https://business.apple.com/#/main/devices",
      "abmAccountName": "",  // abm的帐号
      "abmAccountPassword": "", // abm的密码
      "path2Chrome": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", // chrome的安装地址
      "path2ChromeUserData": "D:\\profile", // chrome用户信息文件地址
      "callBackApiURL": "/abc/callBack", // 回调地址
      "abmCompanyName": "xxx company", // mdm服务器 公司名字
      "abmAPIClientVersion": "2418B35", // abm客户端版本号
      "mdmServerId": "61F3D7A562AC4DE396DEC294ABBF1BE4", // mdm服务器id
      "apiVersion": true, // 启用纯ABM接口调用版本开关
      "responseSuccess": "2", 
      "responseFailed": "3"
    }
    ```
> [!NOTE]\
     * chrome用户信息文件地址，这里必须某一个帐号对应一个文件夹，用于保存记录帐号和设备信息  
     * mdm服务器id是对应想要分配的mdm服务器的公司名字，可以从ABM-API的listMdmServers接口获取。  
     * apiVersion可以切换2种实现，接口调用版本和页面模拟操作版本。


3. ABM-API
    <details>
    <summary>接口</summary>
     
     > 1. extendSession 增加session时间？
     > 2. devicesForPagination 按序列号分页检索设备
     > 3. devicesForPaginationDesc 按创建时间倒序分页检索设备
     > 4. getDeviceDetails 按序列号获取设备详情
     > 5. listMdmServers 获取mdm服务器列表
     > 6. mdmServerDeletionActivities 获取mdm服务器分配状态
     > 7. assignDevices 分配设备到mdm服务器
     > 8. checkActivityProgress 检查分配进度
     > 9. getLFSUStatus 获取LFS状态？

     </details>
   
4. miurasyoten对外接口
   <details>
    <summary>接口</summary>

   > 1. assignDevice 分配设备
   > 2. assignDeviceAndCallBack 分配设备并且回调
   > 3. makeGql 构建graphQL查询ABM数据库
   > 4. health 健康检查

     </details>
## 贡献

..

## 版本

..

## 作者

* **haruka.moe** - *Initial work* - [miurasyoten](https://github.com/miurasyoten)


## 许可

该项目的许可证为　MIT -  [LICENSE.md](LICENSE.md)

## 感谢

* 启示
* 其他
