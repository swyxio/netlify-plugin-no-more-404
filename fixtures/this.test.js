const fs = require('fs');
const path = require('path');

// actual test
const netlifyPlugin = require('../index.js');
test('plugin fixture works', async () => {
  const initPlugin = netlifyPlugin();
  console.log(`running ${initPlugin.name}`);
  // mock everything from netlify build
  let failMessages = [];
  await initPlugin.onPostBuild({
    // from netlify.yml
    inputs: {
      debugMode: false,
      on404: 'error',
      cacheKey: 'pluginNoMore404Cache2'
    },
    constants: {
      // have to mock this too
      CACHE_DIR: 'fixtures-cache', // this is gitignored but check it out
      PUBLISH_DIR: 'fixtures/dist'
    },
    utils: {
      build: {
        // have to mock this too
        failBuild(message) {
          failMessages.push(message);
        }
      }
    }
  });
  if (failMessages.length > 0) {
    console.log(failMessages);
  }
  expect(failMessages.length).toEqual(0);
});

/**
 *
 * utils
 *
 */
