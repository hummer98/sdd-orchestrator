/**
 * SDD_PROJECT_PATH によるプロジェクト自動選択の基本テスト
 *
 * wdio.conf.ts が spec ファイル名に基づいて SDD_PROJECT_PATH を
 * fixtures/test-project に自動設定する。このテストでは:
 * 1. プロジェクトが自動選択されていること
 * 2. Spec一覧が表示されていること
 * 3. Specアイテムが存在すること
 * を検証する。
 */

describe('SDD_PROJECT_PATH によるプロジェクト自動選択', () => {
  it('プロジェクトが自動選択されている', async () => {
    // SDD_PROJECT_PATH が設定されていれば、起動時に自動選択される
    // ストアの currentProject が設定されるまで待つ
    await browser.waitUntil(
      async () => {
        const project = await browser.execute(() => {
          const stores = (window as any).__STORES__;
          return stores?.project?.getState()?.currentProject ?? null;
        });
        return project !== null;
      },
      { timeout: 10000, timeoutMsg: 'プロジェクトが自動選択されなかった' }
    );

    const currentProject = await browser.execute(() => {
      const stores = (window as any).__STORES__;
      return stores?.project?.getState()?.currentProject ?? null;
    });
    expect(currentProject).toBeTruthy();
    expect(currentProject).toContain('test-project');
  });

  it('Spec一覧が表示されている', async () => {
    const specList = await $('[data-testid="spec-list"]');
    await specList.waitForExist({ timeout: 5000 });
    await expect(specList).toBeDisplayed();
  });

  it('Specアイテムが1つ以上存在する', async () => {
    const specListItems = await $('[data-testid="spec-list-items"]');
    await specListItems.waitForExist({ timeout: 5000 });
    const items = await specListItems.$$('li');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('test-feature Specが一覧に表示されている', async () => {
    const specItem = await $('[data-testid="spec-item-test-feature"]');
    await specItem.waitForExist({ timeout: 5000 });
    await expect(specItem).toBeDisplayed();
  });
});
