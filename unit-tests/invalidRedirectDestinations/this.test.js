const fs = require('fs');
const path = require('path');

// resolve all files
let manifest = readIfExists('manifest.json');
if (manifest) manifest = JSON.parse(manifest)['myCacheKey'];
const publishDirPath = path.join(__dirname, 'dist');
const projectDirPath = __dirname;

// debug
// console.log({ publishDirPath, manifest });

// actual test
const pluginCore = require('../../pluginCore.js');
test('missing file but has redirect covering it', async () => {
  const { missingPaths, invalidRedirectDestinations } = await pluginCore({
    projectDirPath,
    publishDirPath,
    manifest,
    debugMode: false, // to future readers - turn this true to make pluginCore log out more stuff
    testMode: true
  });
  if (missingPaths.length > 0) {
    console.log(missingPaths);
  }
  expect(missingPaths.length).toEqual(0);
  expect(invalidRedirectDestinations).toEqual(['/invalidDestination']);
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
