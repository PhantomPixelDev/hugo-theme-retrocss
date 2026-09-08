---
title: "Configuration"
description: "Every parameter the theme reads, and what it changes."
weight: 20
---

## Accent hue

Set `params.accentHue` to any RetroCSS hue and the whole site follows, in both
themes.

## Corners

`params.borderRadius` is the framework's single radius token. `0` keeps the
Windows 95 squares.

## The docs section

Docs layouts are selected by page *type*, so the section's `_index.md` sets it
once and cascades it to everything underneath:

```yaml
---
title: "Documentation"
type: "docs"
cascade:
  type: "docs"
---
```

Order the pages with `weight`. The sidebar tree, the breadcrumbs and the
prev/next footer all read it. If your section is not called `docs`, set
`params.docsSection` to its name as well — that is what tells the sidebar which
section to draw a tree for.

## Blog sections

`params.mainSections` decides which sections the home page, the archive widget
and the tag cloud count as posts. It defaults to Hugo's own convention: the
section with the most pages.
