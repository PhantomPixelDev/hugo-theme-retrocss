---
title: "Shortcodes"
description: "Every RetroCSS component, available from Markdown without writing HTML."
weight: 30
---

The theme ships one shortcode per interactive component. None of them add CSS —
each is a thin wrapper over markup the framework already styles.

## Alerts

{{< alert type="info" title="Heads up" >}}
Alerts take `type` (`primary`, `success`, `warning`, `danger`, `info`) and an
optional `title`.
{{< /alert >}}

{{< alert type="warning" >}}
A warning with no header.
{{< /alert >}}

## Cards

{{< card header="Windows 95" footer="OK" >}}
Cards take `header`, `footer`, `image` and `imageAlt`.
{{< /card >}}

## Badges and buttons

{{< badge type="success" >}}Shipped{{< /badge >}}
{{< badge type="warning" >}}Beta{{< /badge >}}
{{< badge >}}Default{{< /badge >}}

{{< button href="/docs/install/" type="primary" >}}Install the theme{{< /button >}}
{{< button size="sm" >}}A plain button{{< /button >}}

## Tabs

{{< tabs >}}
{{< tab title="npm" >}}
```bash
npm install @phantompixeldev/retrocss
```
{{< /tab >}}
{{< tab title="CDN" >}}
Link the stylesheet from jsDelivr and you are done.
{{< /tab >}}
{{< /tabs >}}

## Accordion

{{< accordion >}}
{{< accordion-item title="Why are the corners square?" >}}
Because Windows 95 was. One token rounds the whole framework if you disagree.
{{< /accordion-item >}}
{{< accordion-item title="Does it work without JavaScript?" >}}
Everything except the components that are interactive by definition.
{{< /accordion-item >}}
{{< /accordion >}}

## Modal and toast

{{< modal id="specs" title="System requirements" trigger="View requirements" >}}
486DX2, 8 MB of RAM, and a copy of Hugo 0.158 or newer.
{{< /modal >}}

{{< toast message="Saved to drive C:" type="success" >}}Save{{< /toast >}}

## Progress and rating

{{< progress value="75" label="Disk C:" >}}
{{< progress value="42" label="Disk D:" type="warning" striped="true" >}}

{{< rating value="4" max="5" label="Nostalgia" >}}

## Tables

{{< table striped="true" sortable="true" >}}
| Component | Class | Interactive |
| --- | --- | --- |
| Card | `.retro-card` | no |
| Modal | `.retro-modal` | yes |
| Accordion | `.retro-accordion` | yes |
{{< /table >}}

## Avatars and tooltips

{{< avatar initials="RD" size="lg" hue="primary" >}}
{{< avatar initials="BM" hue="success" >}}

{{< tooltip text="Appears on focus as well as hover" >}}Hover or tab to this{{< /tooltip >}}
