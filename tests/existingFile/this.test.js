/**
 *
 * DESCRIPTION OF TEST
 *
 *
 * this basic test has a file in manifest.json and matching file in /dist
 * should not identify anything wrong
 *
 *
 */

const fs = require('fs');
const path = require('path');

// resolve all files
let manifest = readIfExists('manifest.json');
if (manifest) manifest = JSON.parse(manifest)['myCacheKey'];
const publishDirPath = path.join(__dirname, 'dist');
const projectDirPath = __dirname;

// debug
const DEBUG = false;
if (DEBUG) {
  console.log({ publishDirPath, manifest });
}

// actual test
const pluginCore = require('../../pluginCore.js');
test('existing file exists', async () => {
  const { missingFiles, invalidRedirectDestinations } = await pluginCore({
    publishDirPath,
    projectDirPath,
    manifest
  });
  expect(missingFiles).toEqual(
    ['/index.html'].map((x) => path.join('/opt/build/repo/dist', x))
  );
  expect(invalidRedirectDestinations.length).toEqual(0);
});

/**
 *
 * utils
 *
 */

function readIfExists(filePath) {
  filePath = path.join(__dirname, filePath);
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return null;
}
