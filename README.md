# Netlify Plugin No More 404

This build plugin will remember the html files you've built, and either warn or fail your build when you make the next build and accidentally lose some html pages (whether on purpose or intentional). The plugin understands [Netlify redirects](https://docs.netlify.com/routing/redirects/), so you can add a redirect to resolve missing html.

> Note: this is different than https://github.com/munter/netlify-plugin-checklinks which checks the validity of *outgoing* links.
>
> this plugin focuses entirely on whether **your own internal URL structure** has been preserved by some combination of your build process (it is agnostic of SSG/framework) and Netlify Redirects 

Because this plugin is SSG/framework agnostic, it can be a great aid for migrating between frameworks.

## Demo

https://github.com/sw-yx/netlify-plugin-no-more-404-demo

## Usage

To install, add the following lines to your `netlify.toml` file:

```toml
[[plugins]]
package = "netlify-plugin-no-more-404"

  # all inputs are optional, we just show you the defaults below
  [plugins.inputs]
  
  # either "warn" or "error"
  on404 = "error" 
  
  # change this key to a new one any time you need to restart from scratch
  cacheKey = "MyCacheKey"
  
  # (for development) turn true for extra diagnostic logging
  debugMode = false
```

## What It Does

On first run, we scan your publish directory and save a manifest of all your html files to a cache. The cache is a simple JSON file using a `cacheKey`.

On subsequent runs:

 - we read the manifest from the cache
 - read any `_redirects` or `netlify.toml` redirects you may have
 - match it against your new publish directory for missing paths (we are agnostic whether you use `/foo` or `/foo.html` or `/foo/index.html`) not covered by a redirect. 
 - By default we fail your build if a missing path is found.
 - If no issues found, we save a new manifest to cache for the next run.

This cache is cleared when you "clear cache and deploy site" in the Netlify UI - I dont know how to get around this yet.

You can see the [/tests](/tests) folder for a definitive guide on what we test against.

> Note: if your [netlify.toml redirects](https://docs.netlify.com/routing/redirects/#syntax-for-the-netlify-configuration-file) have conditions, we don't account for that since we can't be sure to exhaustively check all conditions. We just ignore conditions for now.

### Future plans

WE ARE SEEKING MAINTAINERS. I probably wont have time to attend to this full-time.

- Local (Netlify Dev) testing as a prepush script?
- persist through "clear cache and deploy site".
- Maybe exhaustively check [netlify.toml redirect conditions](https://docs.netlify.com/routing/redirects/#syntax-for-the-netlify-configuration-file)?
- An option for graceful downgrade when some paths are moved to serverless or clientside rendering (right now you have to bump cacheKey to reindex from scratch)
- We could add a `preserveBuildIds` config:

  ```yaml
  plugins:
    - package: netlify-plugin-no-more-404
      config:
        on404: 'error'
        cacheKey: 'anystring' 
        preserveBuildIds: # compare vs specific build IDs to ensure no regression
        - abc123
        - def345
        - ghi678
  ```

