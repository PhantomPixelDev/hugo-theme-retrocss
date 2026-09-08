# Changelog

All notable changes to this theme are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the theme aims at
[semantic versioning](https://semver.org/).

## [Unreleased]

### Added

- First release: a Hugo theme built on RetroCSS 5.0.0.
- Blog templates — home with a featured post, sections, single pages,
  taxonomies and terms, windowed pagination, prev/next, related posts, RSS.
- Docs templates — a weight-ordered section tree, breadcrumbs, in-page contents,
  and prev/next across the whole section.
- Client-side search over an index built as a page resource, so it needs no
  `outputs` config and no library.
- Fourteen shortcodes, one per interactive RetroCSS component.
- Render hooks for images, links, headings and code blocks; code blocks get the
  framework's title bar and copy button, and Chroma classes are mapped onto
  RetroCSS's per-theme syntax tokens.
- SEO: canonical, Open Graph, Twitter cards, and JSON-LD for `WebSite`,
  `BlogPosting` and `BreadcrumbList`.
- Comments via giscus or utterances, off by default.
- Two CI gates ported from RetroCSS: a rendered-page gate (contrast, overflow,
  console errors, `<h1>` count, first-paint theme) and a keyboard-operability
  gate.
- `scripts/vendor-retrocss.mjs`, which pins the framework bundle and refuses a
  stale build.

### Notes

- Requires Hugo 0.158.0 or newer. The **standard** build is enough — the theme
  vendors RetroCSS's compiled CSS precisely so no Sass toolchain is needed.
- Two settings must live in the site's own config, because Hugo does not merge a
  theme's `markup` config: `markup.goldmark.renderer.unsafe = true` and
  `capitalizeListTitles = false`.
