# Changelog

All notable changes to this theme are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the theme aims at
[semantic versioning](https://semver.org/).

## [0.1.1] — 2026-09-08

### Changed

- The theme is now **RetroCSS 9x**. Microsoft's trademark guidelines do not
  permit their marks in a product's name, and "A Windows 95/98 Hugo theme" read
  as one. Headlines, taglines, the package description and the showcase tags say
  Win9x, 90s desktop or mid-90s instead; prose that describes how Windows itself
  behaved stays, because that is nominative use.
- README and the demo's About page carry a trademark disclaimer: independent
  project, not affiliated with or endorsed by Microsoft, and no Microsoft
  artwork, icon or font is included.

### Added

- `params.tagline`, appended to the site title in the home page's `<title>`.
- `params.themeCredit` (default on), which credits the theme in the footer.

### Fixed

- A hand-written root-relative link in content (`/docs/`) dropped the baseURL's
  path, so every internal content link 404'd on a site served from a
  subdirectory. `relURL` does not prefix an already-absolute path, so the link
  render hook takes the prefix from the home page's own `RelPermalink`.
- Links inside a filled alert kept the page-surface link colour, which measures
  1.56:1 against the info fill in dark mode. They now ride the alert's on-fill
  colour.

## [0.1.0] — 2026-09-08

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
