# Netlify Plugin No More 404

> see also https://github.com/munter/netlify-plugin-checklinks

This build plugin will remember the html files you've built, and either warn or fail your build when you make the next build and accidentally lose some html pages (whether on purpose or intentional). The plugin understands [Netlify redirects](https://docs.netlify.com/routing/redirects/), so you can add a redirect to resolve missing html.

## Usage

In the plugins, src, directory, add the path that the assets are in (last line in the yml below)

`netlify.yml`

```yml
build:
  publish: build # NOTE: you should have a publish folder specified here for this to work
  command: echo "your build command goes here"
  NODE_ENV: 10.15.3

plugins:
  - package: netlify-plugin-no-more-404
    config:
      on404: 'error' # either 'warn' or 'error'
      cacheKey: 'anystring' # bump this key any time you need to restart from scratch
      # not yet implemented - compare vs specific build IDs to ensure no regression
      # preserveBuildIds:
      # - foo
      # - foo
      # - foo
```

### Future plans

We could add a `preserveBuildIds` config:

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