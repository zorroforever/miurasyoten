<p align="center">
 <img width="100px" src="/docs/apple.svg" align="center" alt="miurasyoten" />
 <h2 align="center">「三浦書店？」</h2>
 <p align="center">appleビジネスマネジメントは、自分のMDMサーバーにデバイスを自動的に追加します。</p>
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
    <a href="/docs/readme_zh.md">中国语</a>
  </p>
 </p>

## 由来

Apple Configurator 2を使用して追加したappleデバイスを自分のmdmサーバーに自動的に追加して管理する必要があります。これにより、手動で追加する手間が省けます。
通常の手順は次のとおりです：：
```
1. デバイスページを開く。
2. 検索ボックスにシリアル番号を入力する。
3. 検索結果をクリックすると、右側にデバイスの詳細が表示される。
4. 詳細の右上のボタンをクリックしてmdmサーバーを編集する。
5. 希望するmdmサーバーを選択し、確認する。
6. 進行状況バーが完了するのを待ち、完了をクリックする。  
```

このプログラムは手動操作の自動化とappleのインターフェースの直接呼び出しの2つのソリューションを実現しました。（設定ファイルを介して設定します）
> [!NOTE]\
  　　* 初回ログイン時は手動でログインして認証コードを入力し、このデバイスを保存する必要があります。これにより、再度開くと自動的にパスワードを入力するだけでログインでき、携帯電話の認証コードを入力する必要がなくなります。  
  　　* このプログラムは中国語システムのappleビジネスマネジメントシステムに基づいて   

## スタート


nodejsの開発環境を用意する。
```
node -v
```

## インストール

1. 依頼をインストール
   以下のコマンドを実行します。
    ```
    npm install async-lock
    npm install express
    npm install moment-timezone
    npm install puppeteer-core
    npm install winston
    npm install winston-daily-rotate-file
    ```

2. config.jsonファイルを設定する

    ```
    {
    "projectName": "miurasyoten",
    "serverPort": 1234,
    "headless": true,     // ヘッドレスモードのスイッチ
    "appleLoginURL": "https://business.apple.com/",
    "appleDeviceURL": "https://business.apple.com/#/main/devices",
    "abmAccountName": "",  // abmのアカウント
    "abmAccountPassword": "", // abmのパスワード
    "path2Chrome": "C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe", // chromeのインストールパス
    "path2ChromeUserData": "D:\\\\profile", // chromeのユーザーデータファイルパス
    "callBackApiURL": "/abc/callBack", // コールバックURL
    "abmCompanyName": "xxx company", // mdmサーバー 会社名
    "abmAPIClientVersion": "2418B35", // abmクライアントバージョン
    "mdmServerId": "61F3D7A562AC4DE396DEC294ABBF1BE4", // mdmサーバーid
    "apiVersion": true, // 純ABMインターフェース呼び出しバージョンスイッチ
    "responseSuccess": "2",
    "responseFailed": "3"
    }
    ```
> [!NOTE]\
   　　* chromeのユーザーデータファイルパスは、各アカウントに対応するフォルダーが必要で、アカウントとデバイス情報を保存するために使用されます。  
     　* mdmサーバーidは、希望するmdmサーバーの会社名に対応しており、ABM-APIのlistMdmServersインターフェースから取得できます。  
     　* apiVersionは2つの実装を切り替えることができ、インターフェース呼び出しバージョンとページシミュレーション操作バージョンがあります。



3. ABM-API
    <details>
    <summary>インターフェース</summary>

   > 1. extendSession セッション時間を延長する？
   > 2. devicesForPagination シリアル番号ごとにページングしてデバイスを検索する
   > 3. devicesForPaginationDesc 作成時間の降順でページングしてデバイスを検索する
   > 4. getDeviceDetails シリアル番号ごとにデバイスの詳細を取得する
   > 5. listMdmServers mdmサーバーのリストを取得する
   > 6. mdmServerDeletionActivities mdmサーバーの割り当て状態を取得する
   > 7. assignDevices デバイスをmdmサーバーに割り当てる
   > 8. checkActivityProgress 割り当て進行状況を確認する
   > 9. getLFSUStatus LFS状態を取得する？

     </details>
   
4. miurasyoten外部インターフェース
   <details>
    <summary>インターフェース</summary>

   > 1. assignDevice デバイスを割り当てる
   > 2. assignDeviceAndCallBack デバイスを割り当ててコールバックする
   > 3. makeGql graphQLを構築してABMデータベースを検索する
   > 4. health 健康チェック

     </details>
## 貢献

..

## 版本

..

## 作者

* **haruka.moe** - *初期作業* - [miurasyoten](https://github.com/miurasyoten)


## ライセンス

このプロジェクトのライセンスはMITです -  [LICENSE.md](LICENSE.md)

## 感谢

* インスピレーション
* その他
