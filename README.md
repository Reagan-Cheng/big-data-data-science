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

首頁與第一章提供 QR Code 及 PNG 圖片下載。QR Code 指向此 GitHub Pages 網站。
QR Codes and PNG downloads are available on the home and chapter pages.

## 網站架構 / Structure

首頁為 index.html，第一章為 chapter-01/index.html；四個互動遊戲分別位於 chapter-01/games/ 下的 titanic、predpol、decision-lab、airline-survival。
四個遊戲 HTML 與提供的原始 ZIP 完全一致，保留原有遊戲邏輯與語言功能。首頁及第一章支援繁體中文 / English 切換。

## 更新與部署 / Updates and deployment

這是純靜態 HTML/CSS/JavaScript 網站，不需要建置工具或伺服器。
GitHub Pages 設為 Deploy from a branch，main 分支，/(root) 目錄。提交至 main 後會自動發布。
.nojekyll 用於直接發布靜態檔案。

If the repository or hosting URL changes, update assets/qr-codes.js, the links in index.html, assets/qr/urls.json and the six saved PNG files together.

原有 ChatGPT Sites 網站繼續保留：https://big-data-data-science.herrowa.chatgpt.site/

Bundled qrcode-generator is distributed under the MIT license; see assets/vendor/LICENSE.txt.
