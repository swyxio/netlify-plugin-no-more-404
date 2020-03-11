const chalk = require('chalk');
const matchRules = require('./matchRules');
const parseRules = require('./parseRules');
const path = require('path');
const fs = require('fs');
async function pluginCore({
  projectDirPath, // for netlifytoml
  publishDirPath, // for html files and _redirects
  manifest,
  debugMode = false,
  testMode = false
}) {
  // deal with redirects
  let manifestPostRedirects = [];
  let invalidRedirectDestinations = [];

  const parsedRules = parseRules(projectDirPath, publishDirPath);
  if (debugMode) {
    console.log({ parsedRules });
  }
  for (let prevPath of manifest) {
    const match = await matchRules(
      path.relative(publishDirPath, prevPath),
      publishDirPath,
      parsedRules
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
        console.error(
          `Redirect from ${chalk.yellow(match.from)} to ${chalk.yellow(
            match.to
          )} directs to a missing page... please check!`
        );
        invalidRedirectDestinations.push(match.to);
      }
    } else {
      manifestPostRedirects.push(prevPath);
    }
  }

  // checking previous manifests
  // console.log({ manifestPostRedirects })
  let missingFiles = [];
  manifestPostRedirects.forEach((filePath) => {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(filePath);
    }
  });
  if (missingFiles.length || invalidRedirectDestinations.length) {
    missingFiles.forEach((mf) => {
      console.error(
        `${chalk.red('@netlify/plugin-no-more-404:')}: can't find ${chalk.cyan(
          // path.relative(publishDirPath, mf)
          mf
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
        `${chalk.red('@netlify/plugin-no-more-404:')}: can't find ${chalk.cyan(
          // path.relative(publishDirPath, ird)
          ird
        )}, which redirects rely on`
      );
    });
  }
  return { missingFiles, invalidRedirectDestinations };
}

module.exports = pluginCore;
