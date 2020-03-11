const chalk = require('chalk');
const matchRules = require('./matchRules');
const parseRules = require('./parseRules');
const path = require('path');
const fs = require('fs');
async function pluginCore({
  projectDirPath, // for netlifytoml
  publishDirPath, // for html files and _redirects
  manifest,
  testMode = false, // if true, silence warnings that would normally be logged, for test running aesthetics
  debugMode = false // if true, log more things for plugin debugging
}) {
  // deal with redirects
  let missingPaths = [];
  let invalidRedirectDestinations = [];

  const parsedRules = parseRules(projectDirPath, publishDirPath);
  if (debugMode) {
    console.log({
      parsedRules,
      manifest,
      publishDirPath,
      parsedRules
    });
  }

  /**
   *
   * plan:
   *
   * check every path in the manifest
   *  if matches a FROM rule, check if the TO exists
   *  if matches a TO rule, check if the FROM exists
   *
   *
   */
  for (let prevPath of manifest) {
    const checkPath = path.join(publishDirPath, prevPath, 'index.html');
    const match = await matchRules(prevPath, parsedRules);
    if (debugMode) {
      console.log({ checkPath, match });
    }
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
        publishDirPath,
        match.to.endsWith('.html') ? match.to : match.to + '.html' // deal with redirects that specify .html
      );
      const toPath2 = path.join(
        publishDirPath,
        match.to + (match.to.endsWith('index.html') ? '' : '/index.html')
      );
      if (debugMode) {
        console.log({
          publishDirPath,
          prevPath,
          toPath1,
          toPath2,
          relative: path.relative(publishDirPath, prevPath),
          match
        });
      }
      if (fs.existsSync(toPath1) || fs.existsSync(toPath2)) {
        // exists! no longer need to check for broken links
      } else {
        // the redirect itself is invalid!
        if (!testMode)
          console.error(
            `Redirect from ${chalk.yellow(match.from)} to ${chalk.yellow(
              match.to
            )} directs to a missing page... please check!`
          );
        invalidRedirectDestinations.push(match.to);
      }
    } else {
      // no rules match for this prevPath, just do a simple check if its there
      if (
        !fs.existsSync(checkPath) &&
        !fs.existsSync(path.join(publishDirPath, prevPath) + '.html')
      ) {
        missingPaths.push(prevPath);
      }
    }
  }

  if (missingPaths.length || invalidRedirectDestinations.length) {
    if (!testMode) {
      missingPaths.forEach((mf) => {
        console.error(
          `${chalk.red(
            '@netlify/plugin-no-more-404:'
          )}: can't find a file matching ${chalk.cyan(
            // path.relative(publishDirPath, mf)
            mf
          )} which existed in previous build`
        );
      });
    }
    if (!testMode && missingPaths.length) {
      console.warn(
        `Missing HTML files detected. If you intentionally changed URL structure, you should set up redirects: ${chalk.cyan(
          'https://url.netlify.com/B1qkCwqOr'
        )}`
      );
    }
    invalidRedirectDestinations.forEach((ird) => {
      if (!testMode) {
        console.error(
          `${chalk.red(
            '@netlify/plugin-no-more-404:'
          )}: can't find ${chalk.cyan(
            // path.relative(publishDirPath, ird)
            ird
          )}, which redirects rely on`
        );
      }
    });
  }
  return { missingPaths, invalidRedirectDestinations };
}

module.exports = pluginCore;
