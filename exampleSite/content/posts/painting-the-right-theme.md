---
title: "Painting the right theme before the first frame"
date: 2026-08-14
description: "Why the dark palette ships in CSS, and what the four lines of inline script are actually for."
categories: ["Dark mode"]
tags: ["dark mode", "css", "performance"]
cover: "images/covers/dark-mode.svg"
---

A theme flash is not a rendering quirk. It is a page admitting that it decided
what colour to be after it had already been drawn.

## Do it in CSS

The dark palette is emitted twice: once for `[data-theme="dark"]`, and once
under `@media (prefers-color-scheme: dark)` for `:root:not([data-theme="light"])`.
A visitor whose system is dark gets dark on the first paint, before any script
has run — before the bundle has even been requested.

## The one case CSS cannot see

A *stored* choice that differs from the operating system. That is what the
inline snippet in the theme's `<head>` covers, and it is why the snippet has to
be inline: an external or deferred script runs after the first paint, which is
the whole problem.

```html
<script>
  try {
    var retroTheme = localStorage.getItem('retro-theme');
    if (retroTheme) document.documentElement.setAttribute('data-theme', retroTheme);
  } catch (e) {}
</script>
```

The `try` is not defensive theatre. `localStorage` throws outright in a
sandboxed iframe and with third-party storage blocked, and an uncaught throw
here takes the rest of the head with it.
