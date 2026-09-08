---
title: "Why your div is not a button"
date: 2026-08-21
description: "Everything you have to rebuild by hand the moment you style the wrong element."
categories: ["Accessibility"]
tags: ["accessibility", "html", "keyboard"]
cover: "images/covers/accessibility.svg"
---

A `div` with a click handler looks like a button and behaves like nothing.

## What you lose

Tab order. Enter and Space. The implicit `button` role. The disabled state.
Form submission. Focus visibility. Every one of those is a line of code you now
own, and a line you will forget on the next component.

## What it costs to get back

```html
<div role="button" tabindex="0"
     onkeydown="if (event.key === 'Enter' || event.key === ' ') this.click()">
  Save
</div>
```

That is the *minimum*, and it still does not report a disabled state, still does
not submit a form, and still needs `event.preventDefault()` so Space does not
scroll the page.

## The rule

Reach for the element that already means what you are building. Style is cheap
to change; semantics are not.
