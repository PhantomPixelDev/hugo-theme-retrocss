---
title: "Theming"
description: "Change the accent, the corners and the fonts without writing a stylesheet."
weight: 40
---

Everything visual routes through RetroCSS tokens, so a site re-themes itself
from configuration rather than from CSS overrides.

## Accent hue

```toml
[params]
  accentHue = "teal"
```

Any of the framework's hues works: `primary`, `success`, `danger`, `warning`,
`info`, `teal`, `tan`, `pink`, `lime`, `cyan`, `orange`, `brown`, `violet`,
`gray`, `maroon`, `gold`, `navy`, `olive`, `silver`. The theme aliases the four
`--retro-primary*` tiers plus `-rgb` onto that hue, and because the dark palette
redefines every hue, the accent follows into dark mode with its contrast intact.

## Corners

```toml
[params]
  borderRadius = "6px"
```

One token rounds the whole framework — buttons, cards, badges, inputs, navs. The
default is `0`, because Windows 95 was.

## Fonts

```toml
[params]
  fontHeading = "'Segoe UI', Tahoma, sans-serif"
```

## Anything else

Drop a file at `assets/css/custom.css` in your site. The theme concatenates it
last, so it wins without `!important`:

```css
:root { --retro-body-bg: #008080; }
```
