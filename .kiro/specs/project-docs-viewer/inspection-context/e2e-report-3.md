# E2E Test Report - project-docs-viewer (Run 3 - AutoFix Final)

**日時**: 2026-02-05T20:28:06Z
**結果**: 29/29 PASS (100%)

## 実行コマンド
```bash
SDD_PROJECT_PATH="$(pwd)/e2e-wdio/fixtures/docs-viewer-test" npm run test:e2e -- --spec e2e-wdio/project-docs-viewer.e2e.spec.ts
```

## テスト結果

| # | テスト名 | 結果 | UJ |
|---|---------|------|-----|
| 1 | Project tab exists in navigation | PASS | UJ-001 |
| 2 | Clicking Project tab shows project file list | PASS | UJ-001 |
| 3 | Docs section is displayed in project file list | PASS | UJ-001 |
| 4 | Docs section header shows "Docs" | PASS | UJ-001 |
| 5 | Docs section displays files from docs/ folder | PASS | UJ-001 |
| 6 | Docs section displays directory nodes | PASS | UJ-001 |
| 7 | Folder node shows collapsed icon initially | PASS | UJ-002 |
| 8 | Clicking folder expands it and shows expanded icon | PASS | UJ-002 |
| 9 | Expanded folder shows child files | PASS | UJ-002 |
| 10 | Clicking expanded folder collapses it | PASS | UJ-002 |
| 11 | Collapsed folder hides child files | PASS | UJ-002 |
| 12 | Clicking .md file selects it | PASS | UJ-003 |
| 13 | Selected .md file displays in ProjectFileEditor | PASS | UJ-003 |
| 14 | .md file displays correct icon | PASS | UJ-003 |
| 15 | Clicking .pdf file selects it | PASS | UJ-004 |
| 16 | Selected .pdf file displays PdfViewer component | PASS | UJ-004 |
| 17 | PdfViewer contains iframe element | PASS | UJ-004 |
| 18 | .pdf file displays correct icon | PASS | UJ-004 |
| 19 | Clicking .html file selects it | PASS | UJ-004b |
| 20 | Selected .html file displays HtmlViewer component | PASS | UJ-004b |
| 21 | HtmlViewer contains sandboxed iframe | PASS | UJ-004b |
| 22 | .html file displays correct icon | PASS | UJ-004b |
| 23 | Expand folder and select file, then switch tabs | PASS | UJ-005 |
| 24 | Returning to Project tab restores expansion state | PASS | UJ-005 |
| 25 | Returning to Project tab allows re-selecting files | PASS | UJ-005 |
| 26 | Project editor is available after tab switch | PASS | UJ-005 |
| 27 | contextIsolation is enabled | PASS | Security |
| 28 | nodeIntegration is disabled | PASS | Security |
| 29 | Application has not crashed | PASS | Stability |

## 実行時間
12.2 seconds (29 tests)
