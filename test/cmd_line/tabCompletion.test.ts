import * as assert from 'assert';
import { join, sep, basename } from 'path';
import { getAndUpdateModeHandler } from '../../extension';
import { ModeHandler } from '../../src/mode/modeHandler';
import { StatusBar } from '../../src/statusBar';
import * as t from '../testUtils';

suite('cmd_line tabComplete', () => {
  let modeHandler: ModeHandler;
  suiteSetup(async () => {
    await t.setupWorkspace();
    modeHandler = await getAndUpdateModeHandler();
  });

  suiteTeardown(t.cleanUpWorkspace);

  teardown(async () => {
    await modeHandler.handleKeyEvent('<Esc>');
  });

  test('command line command tab completion', async () => {
    await modeHandler.handleMultipleKeyEvents([':', 'e', 'd', 'i']);
    await modeHandler.handleKeyEvent('<tab>');
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.equal(statusBarAfterTab.trim(), ':edit|', 'Command Tab Completion Failed');
  });

  test('command line file tab completion with no base path', async () => {
    await modeHandler.handleKeyEvent(':');
    const statusBarBeforeTab = StatusBar.Get();

    await modeHandler.handleMultipleKeyEvents(['e', ' ', '<tab>']);
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.notEqual(statusBarBeforeTab, statusBarAfterTab, 'Status Bar did not change');
  });

  test('command line file tab completion with / as base path', async () => {
    await modeHandler.handleKeyEvent(':');
    const statusBarBeforeTab = StatusBar.Get();

    await modeHandler.handleMultipleKeyEvents(['e', ' ', '/', '<tab>']);
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.notEqual(statusBarBeforeTab, statusBarAfterTab, 'Status Bar did not change');
  });

  test('command line file tab completion with ~/ as base path', async () => {
    await modeHandler.handleKeyEvent(':');
    const statusBarBeforeTab = StatusBar.Get();

    await modeHandler.handleMultipleKeyEvents(['e', ' ', '~', '/', '<tab>']);
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.notEqual(statusBarBeforeTab, statusBarAfterTab, 'Status Bar did not change');
  });

  test('command line file tab completion with ./ as base path', async () => {
    await modeHandler.handleKeyEvent(':');
    const statusBarBeforeTab = StatusBar.Get();

    await modeHandler.handleMultipleKeyEvents(['e', ' ', '.', '/', '<tab>']);
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.notEqual(statusBarBeforeTab, statusBarAfterTab, 'Status Bar did not change');
  });

  test('command line file tab completion with ../ as base path', async () => {
    await modeHandler.handleKeyEvent(':');
    const statusBarBeforeTab = StatusBar.Get();

    await modeHandler.handleMultipleKeyEvents(['e', ' ', '.', '.', '/', '<tab>']);
    const statusBarAfterTab = StatusBar.Get();

    await modeHandler.handleKeyEvent('<Esc>');
    assert.notEqual(statusBarBeforeTab, statusBarAfterTab, 'Status Bar did not change');
  });

  test('command line file tab completion directory with / at the end', async () => {
    const dirPath = await t.createRandomDir();

    try {
      const baseCmd = `:e ${dirPath.slice(0, -1)}`.split('');
      await modeHandler.handleMultipleKeyEvents(baseCmd);
      await modeHandler.handleKeyEvent('<tab>');
      let statusBarAfterTab = StatusBar.Get().trim();
      await modeHandler.handleKeyEvent('<Esc>');
      assert.equal(statusBarAfterTab, `:e ${dirPath}${sep}|`, 'Cannot complete with / at the end');
    } finally {
      await t.removeDir(dirPath);
    }
  });

  test('command line file navigate tab completion', async () => {
    // tmpDir --- inner0
    //         |- inner1 --- inner10 --- inner100
    const tmpDir = await t.createRandomDir();
    const inner0 = await t.createDir(join(tmpDir, 'inner0'));
    const inner1 = await t.createDir(join(tmpDir, 'inner1'));
    const inner10 = await t.createDir(join(inner1, 'inner10'));
    const inner100 = await t.createDir(join(inner10, 'inner100'));

    try {
      // Tab to see the completion of tempDir
      const cmd = `:e ${tmpDir}${sep}`.split('');
      await modeHandler.handleMultipleKeyEvents(cmd);
      await modeHandler.handleKeyEvent('<tab>');
      let statusBarAfterTab = StatusBar.Get().trim();
      let expectedPath = `${tmpDir}${sep}inner0${sep}`;
      assert.equal(statusBarAfterTab, `:e ${expectedPath}|`, '123');

      // Tab to cycle the completion of tempDir
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      expectedPath = `${tmpDir}${sep}inner1${sep}`;
      assert.equal(statusBarAfterTab, `:e ${expectedPath}|`, '123');

      // <right> and <tab> to select and complete the content in
      // the inner1 directory
      // Since there is only one directory in inner1 which is inner10,
      // The completion is complete.
      await modeHandler.handleMultipleKeyEvents(['<right>', '<tab>']);
      statusBarAfterTab = StatusBar.Get().trim();
      expectedPath = `${tmpDir}${sep}inner1${sep}inner10${sep}`;
      assert.equal(statusBarAfterTab, `:e ${expectedPath}|`, '123');

      // A tab would try to complete the content in the inner10.
      // Since the pervious completion is complete, no <right> is needed to select
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      expectedPath = `${tmpDir}${sep}inner1${sep}inner10${sep}inner100${sep}`;
      assert.equal(statusBarAfterTab, `:e ${expectedPath}|`, '123');

      // Since there isn't any files or directories in inner100, no completion.
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      expectedPath = `${tmpDir}${sep}inner1${sep}inner10${sep}inner100${sep}`;
      assert.equal(statusBarAfterTab, `:e ${expectedPath}|`, '123');

      await modeHandler.handleKeyEvent('<Esc>');
    } finally {
      await t.removeDir(inner100);
      await t.removeDir(inner10);
      await t.removeDir(inner1);
      await t.removeDir(inner0);
      await t.removeDir(tmpDir);
    }
  });

  test('command line tab completion on the content on the left of the cursor', async () => {
    await modeHandler.handleMultipleKeyEvents([':', 'e', 'd', 'i']);
    await modeHandler.handleKeyEvent('<tab>');
    let statusBarAfterTab = StatusBar.Get().trim();
    assert.equal(statusBarAfterTab, ':edit|', 'Command Tab Completion Failed');

    await modeHandler.handleMultipleKeyEvents(['<left>', '<left>']);
    statusBarAfterTab = StatusBar.Get().trim();
    assert.equal(statusBarAfterTab, ':ed|it', 'Failed to move the cursor to the left');

    await modeHandler.handleKeyEvent('<tab>');
    statusBarAfterTab = StatusBar.Get().trim();
    assert.equal(statusBarAfterTab, ':edit|it', 'Failed to complete content left of the cursor');

    await modeHandler.handleKeyEvent('<Esc>');
  });

  test('command line file tab completion with .', async () => {
    const dirPath = await t.createRandomDir();
    const testFilePath = await t.createEmptyFile(join(dirPath, '.testfile'));

    try {
      // There should only be one auto-completion
      const baseCmd = `:e ${dirPath}${sep}`.split('');
      await modeHandler.handleMultipleKeyEvents(baseCmd);
      // First tab - resolve to .testfile
      await modeHandler.handleKeyEvent('<tab>');
      let statusBarAfterTab = StatusBar.Get();
      assert.equal(statusBarAfterTab.trim(), `:e ${testFilePath}|`, 'Cannot complete to .testfile');
      // Second tab - resolve to .testfile
      // ./ and ../ because . is not explicitly typed in.
      // This should be consistent with Vim
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      assert.equal(statusBarAfterTab, `:e ${testFilePath}|`, 'Cannot complete to .testfile');
      await modeHandler.handleKeyEvent('<Esc>');

      await modeHandler.handleMultipleKeyEvents(baseCmd.concat('.'));
      // First tab - resolve to ../
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      assert.equal(statusBarAfterTab, `:e ${dirPath}${sep}..${sep}|`, 'Cannot complete to ../');
      // Second tab - resolve to ./
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      assert.equal(statusBarAfterTab, `:e ${dirPath}${sep}.${sep}|`, 'Cannot complete to ./');
      // Third tab - resolve to .testfile
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      assert.equal(statusBarAfterTab, `:e ${testFilePath}|`, 'Cannot complete to .testfile');
      await modeHandler.handleKeyEvent('<Esc>');
    } finally {
      await t.removeFile(testFilePath);
      await t.removeDir(dirPath);
    }
  });

  test('command line file tab completion with space in file path', async () => {
    // Create an random file in temp folder with a space in the file name
    const spacedFilePath = await t.createRandomFile('', 'vscode-vim completion-test');
    try {
      // Get the base name of the path which is <random name>vscode-vim completion-test
      const baseName = basename(spacedFilePath);
      // Get the base name exclude the space which is <random name>vscode-vim
      const baseNameExcludeSpace = baseName.substring(0, baseName.lastIndexOf(' '));
      const fullPathExcludeSpace = spacedFilePath.substring(0, spacedFilePath.lastIndexOf(' '));
      const failMsg = 'Cannot complete to a path with space';

      // With no base path
      let cmd = `:e ${baseNameExcludeSpace}`.split('');
      await modeHandler.handleMultipleKeyEvents(cmd);
      await modeHandler.handleKeyEvent('<tab>');
      let statusBarAfterTab = StatusBar.Get().trim();
      await modeHandler.handleKeyEvent('<Esc>');
      assert.equal(statusBarAfterTab, `:e ${baseName}|`, `${failMsg} (no base path)`);

      // With multiple ./ ./ as base name
      cmd = `:e ././${baseNameExcludeSpace}`.split('');
      await modeHandler.handleMultipleKeyEvents(cmd);
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      await modeHandler.handleKeyEvent('<Esc>');
      assert.equal(statusBarAfterTab, `:e ././${baseName}|`, `${failMsg} (w ././)`);

      // With full path excluding the last space portion
      cmd = `:e ${fullPathExcludeSpace}`.split('');
      await modeHandler.handleMultipleKeyEvents(cmd);
      await modeHandler.handleKeyEvent('<tab>');
      statusBarAfterTab = StatusBar.Get().trim();
      await modeHandler.handleKeyEvent('<Esc>');
      assert.equal(statusBarAfterTab, `:e ${spacedFilePath}|`, `(${failMsg} full path)`);
    } finally {
      await t.removeFile(spacedFilePath);
    }
  });
});
