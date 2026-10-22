# Updating the portfolio

## Content and résumé

Edit profile, project, experience, education, and skill data in `assets/content.js` and the room narratives in `assets/floor-content.js`. Preserve section IDs and room IDs so existing links keep working. Keep project status, personal contributions, demos, and measured results factual; add new results when they are available rather than estimating them.

Put project images in `assets/projects/`, supply accurate dimensions and useful alternate text, and keep the full original available through its gallery link. Replace `assets/eric-hsu-resume.pdf` when a new résumé is ready. Check contact, repository, demo, and résumé links whenever their destinations change.

Run `npm run reading` after changing shared content. The generated `reading.html` is the complete portfolio and remains usable without JavaScript or WebGL.

## Validation

Use Node.js 24 for the same runtime as CI:

```sh
npm ci
npm run check
npm test
npm run dev
```

The checks cover page assets and room URLs, generated content, watertight model geometry, city boundaries and shading, compact/full detail, raster budgets, room picking and framing, sharing metadata, and the social image. Integration runs cover desktop, portrait, reduced motion, room deep links, and initial WebGL failure; they also verify hidden-tab suspension, idle rendering, resize preservation, cancellation, context-loss cleanup, and navigation.

With the preview server running, open these local QA pages:

- `http://127.0.0.1:4173/scripts/browser-qa.html?width=1280&height=720`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=390&height=844&dpr=3`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=844&height=390&dpr=3`
- `http://127.0.0.1:4173/scripts/browser-qa.html?width=3840&height=2160&dpr=2`
- `http://127.0.0.1:4173/scripts/accessibility-qa.html` (also accepts `width` and `height`)

The WebGL harness exercises every floor and a room close-up, checks draw/raster budgets, detects continued idle rendering or growing GPU allocations, and verifies disposal. The accessibility harness uses the development-only axe dependency and checks thirteen settled views at WCAG A/AA tags, including every section's reading dialog. It requires `npm ci` and is intended for local preview. Automated checks supplement visual and keyboard inspection; they do not certify a screen reader or physical device.

Inspect the opening and expanded views, upper/lower cross-sections, room captions, short landscape panels, long project stories and galleries, and the résumé link. Tab from the page into the reading bypass and canvas; Enter unfolds the tower, arrows rotate it, and Escape steps back through room/floor/tower navigation. Confirm reading mode returns to the same model, and check reduced motion when animation behavior changes.

## Search and sharing

The canonical site is `https://bshwao.github.io/`. Keep `index.html`, the metadata in `scripts/reading.mjs`, `robots.txt`, and `sitemap.xml` aligned if the public address changes. Hash routes share individual rooms; search engines get the complete content from the canonical reading page.

`assets/social-preview.png` is the 1280 × 720 sharing card. Its editable source is `scripts/social-card.html`; render that source at 1280 × 720 and export a real PNG after changing the profile or design. `npm run check` verifies the file format, dimensions, size, and page metadata. The card is not loaded by the 3D experience.

## Release and rollback

Commit reviewed changes and push to `main`. The `Portfolio checks` workflow runs automatically on pushes and pull requests. GitHub Pages uses the existing branch deployment; verify both checks and the `pages build and deployment` run for the published commit, then inspect the live home page, a room deep link, reading page, résumé, sharing card, and sitemap.

After Pages finishes, run `node scripts/verify-live.mjs` to compare the canonical live pages, model/style modules, binary assets, sitemap, crawler setup, and release documentation against the committed `HEAD` snapshot. Text comparisons normalize Windows line endings; PNG/PDF comparisons use the exact bytes. `--record` saves the evidence to `state/deployment.json` for a subsequent documentation commit.

For a regression, use `git revert <commit>` and publish the revert through the same checks. This preserves history and provides a reproducible rollback. `node_modules/` and `.preview/` are local-only and stay ignored.

Periodic content review is ongoing maintenance: revisit project status, experience, résumé, external links, demos, and measured results when they change. No unattended account changes or recurring notification jobs are configured.
