const path = require('path');
const fs = require('fs');
const pluginCore = require('./pluginCore');
const { promisify } = require('util');
const chalk = require('chalk');
const readDir = promisify(fs.readdir);
const Conf = require('conf'); // for simple kv store

// const test404plugin = true // toggle this off for production
const test404plugin = false; // toggle this off for production

module.exports = function netlify404nomore(conf) {
  return {
    /* index html files preDeploy */
    onPostBuild: async ({
      inputs: {
        debugMode = false, // send true to make it print out more stuff
        on404 = 'error', // either 'warn' or 'error'
        cacheKey = 'pluginNoMore404Cache' // string - helps to quickly switch to a new cache if a mistake was made
      },
      constants,
      utils: { build }
    }) => {
      const { CACHE_DIR, PUBLISH_DIR } = constants; // from netlify build or testing fixture

      // kvstore in `${CACHE_DIR}/${name}.json`
      // we choose to let the user createStore instead of doing it for them
      // bc they may want to set `defaults` and `schema` and `de/serialize`
      const store = new Conf({
        cwd: CACHE_DIR,
        configName: 'netlify-plugin-no-more-404'
      });

      if (debugMode) {
        if (fs.existsSync(store.path)) {
          console.log('here are the raw contents of store.path');
          console.log(fs.readFileSync(store.path, { encoding: 'utf8' }));
        } else {
          console.warn(
            `no store found at ${store.path}, will be starting from scratch`
          );
        }
      }
      const prevManifest = store.get(cacheKey) || [];
      if (debugMode) {
        console.log({ prevManifest });
        // console.log({ cwd: process.cwd(), dirname: __dirname });
        // console.log('reading dir');
        // const filesindir = await readDir(path.join(process.cwd()));
        // console.log({ filesindir });
        // const filesindir2 = await readDir(path.join(process.cwd(), '../'));
        // console.log({ filesindir2 });
      }
      // check that PUBLISH_DIR exists
      if (!fs.existsSync(path.resolve(PUBLISH_DIR))) {
        console.error(`Error: PUBLISH_DIR ${PUBLISH_DIR} doesn't exist, this plugin will fail to succeed.
        Has your build built to a different directory or have you accidentally gitignored your publish folder?`);
      }
      // add missing paths for testing
      if (test404plugin) {
        prevManifest.push(path.join(PUBLISH_DIR, '/path/to/missing.html'));
        prevManifest.push(path.join(PUBLISH_DIR, '/path/to/missing2.html'));
        prevManifest.push(path.join(PUBLISH_DIR, '/path/missing3.html'));
      }

      /**
       *
       *
       * DO the big check
       *
       *
       *
       */
      let buildFailMsgs = [];
      if (prevManifest.length) {
        const { missingPaths, invalidRedirectDestinations } = await pluginCore({
          projectDirPath: process.cwd(),
          publishDirPath: PUBLISH_DIR,
          manifest: prevManifest,
          debugMode
        });
        if (on404 === 'error') {
          if (missingPaths.length)
            buildFailMsgs.push(
              `${chalk.red.bold(missingPaths.length)} files were missing`
            );
          if (invalidRedirectDestinations.length)
            buildFailMsgs.push(
              `${chalk.red.bold(
                invalidRedirectDestinations.length
              )} redirect destinations were missing`
            );
          if (buildFailMsgs.length) {
            buildFailMsgs.push(
              `netlify-plugin-no-more-404's ${chalk.cyan(
                'config.on404'
              )} option is set/default to ${chalk.red('error')}`
            );
            build.failBuild(`${buildFailMsgs.join(' and ')}, terminating build.`);
          }
        }
      }
      if (buildFailMsgs.length === 0) {
        let newManifest = [];
        newManifest = await walk(path.join(process.cwd(), PUBLISH_DIR));
        newManifest = newManifest
          .filter((x) => x.endsWith('.html'))
          .map((x) => {
            let shortPath = path.relative(
              path.join(process.cwd(), PUBLISH_DIR),
              x
            );
            if (shortPath.endsWith('index.html'))
              shortPath = shortPath.slice(0, -10);
            else if (shortPath.endsWith('.html'))
              shortPath = shortPath.slice(0, -5);
            return shortPath;
          });
        // honestly we can log out the new and deleted pages as well if we wish
        // next time, baby
        var items = [...prevManifest, ...newManifest];
        var uniqueItems = Array.from(new Set(items));
        if (debugMode) {
          console.log(`saving manifest for next time! to cacheKey ${cacheKey}`);
          console.log({ uniqueItems });
        }
        store.set(cacheKey, uniqueItems);
        console.log('html manifest saved for next run');
      }
    }
  };
};

// recursive crawl to get a list of filepaths
// https://gist.github.com/kethinov/6658166
var walk = async function(dir, filelist) {
  var files = await readDir(dir);
  filelist = filelist || [];
  await Promise.all(
    files.map(async function(file) {
      const dirfile = path.join(dir, file);
      if (fs.statSync(dirfile).isDirectory()) {
        filelist = await walk(dirfile + '/', filelist);
      } else {
        filelist.push(dirfile);
      }
    })
  );
  return filelist;
};
