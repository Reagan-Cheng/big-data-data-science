# 大數據與資料科學 / Big Data & Data Science

本網站僅供國立台灣科技大學「大數據與資料科學」課程教學使用。
網站建立者：成力庚。

This website is for teaching the Big Data & Data Science course at National Taiwan University of Science and Technology. Created by 成力庚.

## 公開網站與活動 / Public website and activities

- [課程首頁 / Course Home](https://reagan-cheng.github.io/big-data-data-science/)
- [第一章｜大數據概論 / Chapter 1 | Introduction to Big Data](https://reagan-cheng.github.io/big-data-data-science/chapter-01/)
- [Titanic 生存預測 / Titanic Survival Prediction](https://reagan-cheng.github.io/big-data-data-science/chapter-01/games/titanic/)
- [預測式巡邏：偏誤迴圈 / Predictive Policing: Bias Loop](https://reagan-cheng.github.io/big-data-data-science/chapter-01/games/predpol/)
- [大數據決策實驗室 / Big Data Decision Lab](https://reagan-cheng.github.io/big-data-data-science/chapter-01/games/decision-lab/)
- [航空公司生存戰：預測維護 / Airline Survival: Predictive Maintenance](https://reagan-cheng.github.io/big-data-data-science/chapter-01/games/airline-survival/)
- [第二章｜大數據行銷 / Chapter 2 | Big Data in Marketing](https://reagan-cheng.github.io/big-data-data-science/chapter-02/)
- [旅人人格測驗 / Traveler Personality Quiz](https://traveler-classroom-lab.herrowa.chatgpt.site/)（外部網站 / hosted externally）
- [最後一張優惠券 / The Last Coupon](https://last-coupon-rfm.herrowa.chatgpt.site/)（外部網站 / hosted externally）
- [動態標籤實戰 / Dynamic Labels in Action](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/dynamic-labels/)

首頁提供課程首頁與各章的 QR Code；各章頁面提供該章每個活動的 QR Code，皆可下載 PNG 圖片。
The home page carries QR Codes for the course home and each chapter; each chapter page carries the QR Codes for its own activities. All can be downloaded as PNG.

## 網站架構 / Structure

首頁為 index.html，第一章為 chapter-01/index.html，第二章為 chapter-02/index.html。

第一章的四個互動遊戲分別位於 chapter-01/games/ 下的 titanic、predpol、decision-lab、airline-survival。
四個遊戲 HTML 與提供的原始 ZIP 完全一致，保留原有遊戲邏輯與語言功能。

第二章有三個活動：旅人人格測驗與最後一張優惠券仍放在各自的 ChatGPT Sites 網站，第二章頁面以外部連結開啟；
動態標籤實戰位於 chapter-02/games/dynamic-labels/，中英文同時顯示。

首頁及各章頁面支援繁體中文 / English 切換。

## 更新與部署 / Updates and deployment

這是純靜態 HTML/CSS/JavaScript 網站，不需要建置工具或伺服器。
GitHub Pages 設為 Deploy from a branch，main 分支，/(root) 目錄。提交至 main 後會自動發布。
.nojekyll 用於直接發布靜態檔案。

If the repository or hosting URL changes, update assets/qr-codes.js, the links in index.html, assets/qr/urls.json and the saved PNG files in assets/qr/ together.
If an externally hosted activity moves, update its URL in chapter-02/index.html, assets/qr/urls.json and its PNG.

原有 ChatGPT Sites 網站繼續保留：https://big-data-data-science.herrowa.chatgpt.site/

Bundled qrcode-generator is distributed under the MIT license; see assets/vendor/LICENSE.txt.
