# 香港幼稚園 Top-100 靜態網站

此專案提供香港 100 間幼稚園的靜態展示網站，無須任何後端即可部署於 GitHub Pages。

## 檔案說明
| 檔名 | 作用 |
|------|------|
| index.html | 主頁，內含 UI、Tailwind 與 JS 過濾邏輯（以相對路徑載入 merged.json） |
| merged.json | 100 間幼稚園完整靜態資料（可自行更新） |
| .nojekyll | 空白檔，避免 GitHub Pages 使用 Jekyll 導致檔案被忽略 |
| README.md | 本說明檔 |

## 部署步驟
1. 將四檔放在資料夾根目錄後 `git init`、`git add .`、`git commit -m "init"`。
2. 推至 GitHub，於 **Settings → Pages** 選擇 **Branch = main**、**Folder = /root**。
3. 等候約 1 分鐘自動部署完成，網址：`https://<username>.github.io/<repo>/`。

## 更新資料
- 只需替換 `merged.json` 後重新 push；無需改動 HTML。

## 本地測試
```bash
npx http-server . -p 8080
# 瀏覽 http://127.0.0.1:8080/
```

---
Powered by Perplexity AI.