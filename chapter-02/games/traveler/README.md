# 旅人人格測驗／旅人風格體驗

此資料夾是可直接上傳至 GitHub Pages 的完整靜態網站，包含繁體中文／英文介面、十題 TIPI 人格量表、計分程式、五種旅人圖片、結果與教學揭露、量表來源及說明檔。網站檔案保留原始內容，無須安裝套件或建置。

## 上傳並開啟 GitHub Pages

1. 解壓縮 ZIP。
2. 在 GitHub 建立一個公開 repository，例如 traveler-personality；也可以使用自己的既有 repository 中的獨立子資料夾。
3. 若使用獨立 repository，將解壓縮後的所有檔案與資料夾上傳至 repository 最上層。index.html 必須在最上層，assets 與 sources 資料夾要保持完整。上傳解壓後的內容，不是 ZIP 本身，也不要多包一層外部資料夾。
4. 開啟 Settings → Pages，Source 選 Deploy from a branch，Branch 選實際存放檔案的分支（通常為 main），Folder 選 /(root)，按 Save。
5. 發布完成後，在 Settings → Pages 按 Visit site。獨立專案的一般網址為 https://你的帳號.github.io/你的repository名稱/。
6. 若放在已有 GitHub Pages 網站的子資料夾 traveler/，保持既有 Pages 設定，透過原網站網址後方的 /traveler/ 進入；不要覆蓋原網站的 index.html。

.nojekyll 是附加的空白檔案，建議一併上傳。所有網站資源使用相對路徑，適用於 repository 根目錄及子資料夾。

GitHub 官方說明：https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 本機預覽

此網站使用 JavaScript 模組，請透過 HTTP 伺服器開啟，避免直接雙擊 index.html 導致瀏覽器限制模組載入。若電腦已安装 Python，可在此資料夾開啟終端機，執行：

    python -m http.server 8000

然後開啟 http://localhost:8000/。也可使用 VS Code 的 Live Server 或直接等候 GitHub Pages 發布後預覽。

## 檔案

- index.html：網站入口
- app.js：互動流程與介面
- core.mjs：計分與狀態邏輯
- scale-data.js：量表題目與來源資料
- style.css、favicon.svg：外觀及圖示
- assets/travelers/：五張旅人圖片
- sources/：TIPI 英文 PDF、題項及計分鍵、許可與限制說明

## 活動及來源

原始量表為 Gosling 等人（2003）的 TIPI；中文題項採用 Lu 等人（2020）附錄，轉為繁體字。完整來源、許可與限制保留在網站揭露頁和 sources/。五種旅人故事為教學娛樂映射。

作答資料保存在目前分頁的 sessionStorage，沒有作答上傳 API 或後端資料庫；重新開始與退出會清除此活動的分頁狀態。

匯出日期：2026-10-04。15 個原始網站檔案與本機既有 GitHub 整理版本逐一比對相同，匯出時不變更題目、計分或圖片。