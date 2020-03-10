const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const readDir = promisify(fs.readdir);
const chalk = require('chalk');
const Conf = require('conf'); // for simple kv store

const matchRules = require('./matchRules');
// const test404plugin = true // toggle this off for production
const test404plugin = false; // toggle this off for production

module.exports = function netlify404nomore(conf) {
  return {
    name: 'netlify-plugin-no-more-404',
    /* index html files preDeploy */
    onPostBuild: async ({
      pluginConfig: {
        debug = false, // send true to make it print out more stuff
        on404 = 'error', // either 'warn' or 'error'
        cacheKey = 'pluginNoMore404Cache' // string - helps to quickly switch to a new cache if a mistake was made
      },
      constants,
      utils: { build }
    }) => {
      const { CACHE_DIR, BUILD_DIR } = constants; // where we start from

      // kvstore in `${CACHE_DIR}/${name}.json`
      // we choose to let the user createStore instead of doing it for them
      // bc they may want to set `defaults` and `schema` and `de/serialize`
      const store = new Conf({
        cwd: CACHE_DIR,
        configName: 'netlify-plugin-no-more-404'
      });

      if (debug) {
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
      if (debug) {
        console.log({ prevManifest });
        // console.log({ cwd: process.cwd(), dirname: __dirname });
        // console.log('reading dir');
        // const filesindir = await readDir(path.join(process.cwd()));
        // console.log({ filesindir });
        // const filesindir2 = await readDir(path.join(process.cwd(), '../'));
        // console.log({ filesindir2 });
      }
      // check that BUILD_DIR exists
      if (!fs.existsSync(path.resolve(BUILD_DIR))) {
        console.error(`Error: BUILD_DIR ${BUILD_DIR} doesn't exist, this plugin will fail to succeed. 
        Has your build built to a different directory or have you accidentally gitignored your publish folder?`);
      }
      // add missing paths for testing
      if (test404plugin) {
        prevManifest.push(path.join(BUILD_DIR, '/path/to/missing.html'));
        prevManifest.push(path.join(BUILD_DIR, '/path/to/missing2.html'));
        prevManifest.push(path.join(BUILD_DIR, '/path/missing3.html'));
      }

      /**
       *
       *
       * DO the big check
       *
       *
       *
       */
      if (prevManifest.length) {
        // deal with redirects
        let prevManifestPostRedirects = [];
        let invalidRedirectDestinations = [];
        for (let prevPath of prevManifest) {
          const match = await matchRules(
            path.relative(BUILD_DIR, prevPath),
            BUILD_DIR,
            debug
          );
          if (match) {
            // match is an object that looks like
            //  { from: '/path/to/*',
            //  to: '/blog/first',
            //  host: '',
            //  scheme: '',
            //  status: 301,
            //  force: false,
            //  negative: false,
            //  conditions: {},
            //  exceptions: {} }
            const toPath1 = path.join(
              BUILD_DIR,
              match.to.endsWith('.html') ? match.to : match.to + '.html' // deal with redirects that specify .html
            );
            const toPath2 = path.join(
              BUILD_DIR,
              match.to + (match.to.endsWith('index.html') ? '' : '/index.html')
            );
            if (debug) {
              console.log({
                BUILD_DIR,
                prevPath,
                toPath1,
                toPath2,
                relative: path.relative(BUILD_DIR, prevPath),
                match
              });
            }
            if (fs.existsSync(toPath1) || fs.existsSync(toPath2)) {
              // exists! no longer need to check for broken links
            } else {
              // the redirect itself is invalid!
              console.error(
                `Redirect from ${chalk.yellow(match.from)} to ${chalk.yellow(
                  match.to
                )} directs to a missing page... please check!`
              );
              invalidRedirectDestinations.push(match.to);
            }
          } else {
            prevManifestPostRedirects.push(prevPath);
          }
        }

        // checking previous manifests
        // console.log({ prevManifestPostRedirects })
        let missingFiles = [];
        prevManifestPostRedirects.forEach((filePath) => {
          if (!fs.existsSync(filePath)) {
            missingFiles.push(filePath);
          }
        });
        if (missingFiles.length || invalidRedirectDestinations.length) {
          missingFiles.forEach((mf) => {
            console.error(
              `${chalk.red(
                '@netlify/plugin-no-more-404:'
              )}: can't find ${chalk.cyan(
                path.relative(BUILD_DIR, mf)
              )} which existed in previous build`
            );
          });
          if (missingFiles.length) {
            console.log(
              `Missing HTML files detected. If you intentionally changed URL structure, you should set up redirects: ${chalk.cyan(
                'https://url.netlify.com/B1qkCwqOr'
              )}`
            );
          }
          invalidRedirectDestinations.forEach((ird) => {
            console.error(
              `${chalk.red(
                '@netlify/plugin-no-more-404:'
              )}: can't find ${chalk.cyan(
                // path.relative(BUILD_DIR, ird)
                ird
              )}, which redirects rely on`
            );
          });
          if (on404 === 'error') {
            const msgs = [];
            if (missingFiles.length)
              msgs.push(
                `${chalk.red.bold(missingFiles.length)} files were missing`
              );
            if (invalidRedirectDestinations.length)
              msgs.push(
                `${chalk.red.bold(
                  invalidRedirectDestinations.length
                )} redirect destinations were missing`
              );
            msgs.push(
              `netlify-plugin-no-more-404's ${chalk.cyan(
                'config.on404'
              )} option is set/default to ${chalk.red('error')}`
            );
            build.fail(`${msgs.join(' and ')}, terminating build.`);
          }
        }
      }

      let newManifest = [];
      newManifest = await walk(path.join(process.cwd(), BUILD_DIR));
      newManifest = newManifest.filter((x) => x.endsWith('.html'));
      // honestly we can log out the new and deleted pages as well if we wish
      // next time, baby
      var items = [...prevManifest, ...newManifest];
      var uniqueItems = Array.from(new Set(items));
      store.set(cacheKey, uniqueItems);
      console.log('html manifest saved for next run');
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
