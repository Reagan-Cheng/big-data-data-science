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
- [店長的一天：RFM 足測鞋店 / Store Manager for a Day](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/aso-store/)
- [裝甲該裝在哪裡？倖存者偏差 / Where Should the Armour Go?](https://reagan-cheng.github.io/big-data-data-science/chapter-02/games/armor/)
- [第三章｜金融大數據 / Chapter 3 | Financial Big Data](https://reagan-cheng.github.io/big-data-data-science/chapter-03/)
- [刷卡被拒：信用額度不足 / Card Declined: Credit Limit Too Low](https://reagan-cheng.github.io/big-data-data-science/chapter-03/cases/card-declined/)
- [個案：ABC衛浴生活館 / ABC Bath & Living](https://reagan-cheng.github.io/big-data-data-science/chapter-03/cases/abc-bath-living/)

首頁提供課程首頁與各章的 QR Code；各章頁面提供該章每個活動的 QR Code，皆可下載 PNG 圖片。
The home page carries QR Codes for the course home and each chapter; each chapter page carries the QR Codes for its own activities. All can be downloaded as PNG.

## 其他頁面 / Other pages

- [衝突風格自評 / Conflict Style Self-Assessment](https://reagan-cheng.github.io/big-data-data-science/conflict-style/)：不屬於本課程，供另一門「團隊溝通與衝突溝通」培訓課使用，未列在首頁與各章頁面。位於 conflict-style/index.html，單一檔案、不連外部資源；20 題作答後在手機上計分並畫出雷達圖，答案不會上傳。
  Not part of this course; used in a separate training session and not linked from the home or chapter pages. A single self-contained file at conflict-style/index.html: 20 items, scored on the phone and shown as a radar chart; answers are never uploaded.

## 網站架構 / Structure

首頁為 index.html，第一章為 chapter-01/index.html，第二章為 chapter-02/index.html，第三章為 chapter-03/index.html。

第一章的四個互動遊戲分別位於 chapter-01/games/ 下的 titanic、predpol、decision-lab、airline-survival。
titanic、decision-lab、airline-survival 的 HTML 與提供的原始 ZIP 完全一致，保留原有遊戲邏輯與語言功能。
predpol 另外加上手機與小平板的版面（螢幕寬度 850px 以下，或手機橫放）：保留地圖（街道、河流、道路、警察局與各區的相對位置），各區文字精簡，紅區會整區變紅並顯示紅色標記；計分板固定在上方，派警車按鈕移到地圖上的警察局，所選區域的資料固定在下方；計分、計時與模型規則的程式沒有更動，桌機版面維持原樣。

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

店長的一天：RFM 足測鞋店位於 chapter-02/games/aso-store/（單一 index.html，無外部資源），改編自講義 p.34–37 的阿瘦個案。經營 10～12 月一季，右上角倒數 5 分鐘（第一位客人進店開始計時，對話框開著也不停；時間到立刻結算），10 位會員每次隨機 1～3 位進店、各來 1～3 次；上方顯示日期、倒數、營業額／目標（NT$30,000）與每位會員的忠誠度條。網址加 ?sec=180 可改成 3 分鐘，業績目標會等比例調整。目標是達成業績並讓忠誠客戶（忠誠度 70 以上）多於開店時的 3 位。客人頭上有滿意度，等太久或服務錯誤會下降，歸零即生氣離開、忠誠度 −35；忠誠度低於 30 就不再來。手機與直向螢幕使用直向門市＋底部面板、點地板走路；寬螢幕使用橫向門市＋側欄，也可用方向鍵或 WASD。右上角可切換中文與英文。結束後有結算與五題討論題。

裝甲該裝在哪裡？位於 chapter-02/games/armor/（單一 index.html，無外部資源），對應第二章講義「正確解讀數據 & 問對問題」的二戰轟炸機彈痕例子（倖存者偏差）。流程：看返航飛機彈痕 → 選 2 片裝甲 → 100 架出任務 → 揭露被擊落飛機的彈孔 → 第二次選擇 → 3 題行銷資料倖存者偏差題 → 討論題。模擬使用固定亂數種子，同樣的選擇得到同樣的結果。右上角可切換中文與英文。

裝甲遊戲的課堂投票：教師頁是 chapter-02/games/armor/teacher.html，輸入班級代碼與教師密碼後，學生用教師頁上的網址（`?class=班級代碼`）進入、填組名，第一輪、猜測、第二輪與行銷題的答案會自動送到 Google 試算表的「投票」分頁，教師頁每 4 秒更新長條圖與各組明細，也可以先隱藏結果。和最後一張優惠券共用同一個 Apps Script（chapter-02/games/last-coupon/backend/Code.gs，網址在 last-coupon/config.js）；更新程式碼後要在 Apps Script 部署「新版本」。沒有 `?class=` 的網址則照常單機遊玩，不送出任何資料。

第三章有一個個案閱讀頁：刷卡被拒：信用額度不足位於 chapter-03/cases/card-declined/（單一 index.html，無外部資源），呈現講義 p.10–14 國泰世華個案的英文全文（逐字照講義，不摘要），最後附 p.9 的兩題討論題。每一句是一個 <span class="s" data-st="N">，讀到第幾句，旁邊的示意圖就畫到第 N 步；手機上示意圖固定在上方、原文在下方捲動。預設英文，右上角可切換中文（中文為英文個案的逐句翻譯，存在程式內的 ZH_S 陣列，插圖文字放在各元素的 data-zh）；網址加 ?lang=zh 或 ?lang=en 指定語言。投影時可用簡報筆（PageDown）或 ↓／Space 逐句前進，Spotlight／聚焦會淡化其他句子，A−／A+ 調整字體。

第三章的第二個個案：個案：ABC衛浴生活館位於 chapter-03/cases/abc-bath-living/（單一 index.html，無外部資源），是虛構的教學個案，呈現講義 p.2–10 的中文原文全文（逐字照講義，不摘要），英文版為逐段翻譯；兩者都放在程式開頭的 CASE 資料，每段為 [第幾步, 中文原文, 英文, 中文螢光標示, 英文螢光標示]。每一段驅動旁邊示意圖的第 N 步。預設英文，右上角可切換中文；?lang=zh 或 ?lang=en 指定語言。最後是 p.11–13 的顧客旅程地圖活動：五個階段各選心情（2 到 −2）並寫原因，頁面畫出情緒曲線、加總體驗分數，接著是 p.12 的討論題；答案只存在學生自己的瀏覽器（localStorage），不會上傳。p.12 的「機會／命運」卡未放進網頁，由教師在課堂上進行。

首頁及各章頁面支援繁體中文 / English 切換。

## 更新與部署 / Updates and deployment

這是純靜態 HTML/CSS/JavaScript 網站，不需要建置工具或伺服器。
GitHub Pages 設為 Deploy from a branch，main 分支，/(root) 目錄。提交至 main 後會自動發布。
.nojekyll 用於直接發布靜態檔案。

If the repository or hosting URL changes, update assets/qr-codes.js, the links in index.html, assets/qr/urls.json and the saved PNG files in assets/qr/ together.

原有 ChatGPT Sites 網站繼續保留：https://big-data-data-science.herrowa.chatgpt.site/

Bundled qrcode-generator is distributed under the MIT license; see assets/vendor/LICENSE.txt.
