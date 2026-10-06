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
- [動態標籤實戰 / Dynamic Labels in Action](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/dynamic-labels/)
- [直接用，還是先問為什麼？ / Apply It, or Ask Why?](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/apply-or-ask-why/)
- [旅人人格測驗 / Traveler Personality Quiz](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/traveler/)
- [最後一張優惠券 / The Last Coupon](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/last-coupon/)

首頁提供課程首頁與各章的 QR Code；各章頁面提供該章每個活動的 QR Code，皆可下載 PNG 圖片。
The home page carries QR Codes for the course home and each chapter; each chapter page carries the QR Codes for its own activities. All can be downloaded as PNG.

## 其他頁面 / Other pages

- [衝突風格自評 / Conflict Style Self-Assessment](https://reagan-cheng.github.io/big-data-data-science/conflict-style/)：不屬於本課程，供另一門「團隊溝通與衝突溝通」培訓課使用，未列在首頁與各章頁面。位於 conflict-style/index.html，單一檔案、不連外部資源；20 題作答後在手機上計分並畫出雷達圖，答案不會上傳。
  Not part of this course; used in a separate training session and not linked from the home or chapter pages. A single self-contained file at conflict-style/index.html: 20 items, scored on the phone and shown as a radar chart; answers are never uploaded.

## 網站架構 / Structure

首頁為 index.html，第一章為 chapter-01/index.html，第二章為 chapter-02/index.html。

第一章的四個互動遊戲分別位於 chapter-01/games/ 下的 titanic、predpol、decision-lab、airline-survival。
titanic、decision-lab、airline-survival 的 HTML 與提供的原始 ZIP 完全一致，保留原有遊戲邏輯與語言功能。
predpol 另外加上手機與小平板的版面（螢幕寬度 850px 以下，或手機橫放）：各區改為方塊排列，計分板固定在上方、派警車按鈕固定在下方；計分、計時與模型規則的程式沒有更動，桌機版面維持原樣。

第二章有四個活動：旅人人格測驗位於 chapter-02/games/traveler/，檔案與提供的原始 ZIP 完全一致（來源與許可說明見該資料夾的 README.md 與 sources/），右上角可切換中文與英文；
最後一張優惠券位於 chapter-02/games/last-coupon/，右上角可切換中文與英文；
動態標籤實戰位於 chapter-02/games/dynamic-labels/，中英文同時顯示；
「直接用，還是先問為什麼？」位於 chapter-02/games/apply-or-ask-why/，中英文同時顯示，對應講義 Causation vs. Correlation 一頁，約 10 分鐘。

最後一張優惠券的遊戲本體是 index.html，內含三段程式：ENGINE（顧客模擬模型，參數集中在開頭的 P 物件）、COPY（全部中英文文字）、APP（畫面與流程）。
網址後加 ?seed=7 可換一批模擬會員，?lang=zh 或 ?lang=en 指定首次開啟的語言，?reset=1 清除該裝置上的進度。
模型邏輯與建議的時間分配寫在遊戲結算頁最下方「給授課教師的說明」。

最後一張優惠券的班級模式（教師看各組分數與回答、由教師開放下一季）：
- 教師頁：chapter-02/games/last-coupon/teacher.html。在這裡自訂班級代碼、取得學生用的網址與 QR Code、查看各季各組的決定、回答與四個數字，並按「開放」讓各組進入下一季。
- 學生從 `?class=班級代碼` 的網址進入才會啟用班級模式；直接開啟遊戲則是單機模式，不會送出任何資料。
- 資料存在教師自己的 Google 試算表。後端程式是 chapter-02/games/last-coupon/backend/Code.gs，貼進該試算表的 Apps Script 後部署為網頁應用程式（執行身分：我；誰可以存取：所有人）。詳細步驟寫在教師頁。
- 部署後的網址（結尾 /exec）填在 chapter-02/games/last-coupon/config.js 的 syncUrl。留空時班級模式不啟用。
- 修改 Code.gs 之後，要在 Apps Script 重新「管理部署作業 → 編輯 → 新版本」才會生效。

首頁及各章頁面支援繁體中文 / English 切換。

## 更新與部署 / Updates and deployment

這是純靜態 HTML/CSS/JavaScript 網站，不需要建置工具或伺服器。
GitHub Pages 設為 Deploy from a branch，main 分支，/(root) 目錄。提交至 main 後會自動發布。
.nojekyll 用於直接發布靜態檔案。

If the repository or hosting URL changes, update assets/qr-codes.js, the links in index.html, assets/qr/urls.json and the saved PNG files in assets/qr/ together.

原有 ChatGPT Sites 網站繼續保留：https://big-data-data-science.herrowa.chatgpt.site/

Bundled qrcode-generator is distributed under the MIT license; see assets/vendor/LICENSE.txt.
