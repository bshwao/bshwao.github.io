# Eric Hsu — Architectural portfolio

A buildless personal portfolio for GitHub Pages. The opening screen presents an original, dense blue wireframe skyscraper against a pure white background. Its low-angle perspective, tapered form, and stepped setbacks create the architectural entry point. Select the tower to expand five clickable height bands and reveal About, Projects, Experience, Résumé, and Contact. Select a band to zoom toward it, then enter a top-down floor plan with portfolio content arranged inside its rooms.

## Preview

With Node.js 20.11 or newer installed:

```sh
npm run dev
```

Open `http://127.0.0.1:4173`. No packages need to be installed. Use `PORT` to select another port. The server binds only to the local computer.

Run `npm run check` to check JavaScript syntax. There is no build step.

## Edit the site

- `assets/content.js`: profile, projects, experience, education, skills, and personal details. The content is based on the supplied October 20, 2026 résumé; missing project dates are intentionally omitted.
- `assets/floor-content.js`: maps the supplied content to the rooms on each floor. Projects has three rooms; the other floors each have four.
- `assets/skyscraper.js`: procedural SVG tower geometry, blue wireframe linework, perspective projection, and five height-band targets.
- `assets/floor-plans.js`: top-down SVG architectural plans and the room positions shared by the content renderer.
- `assets/floor-view.js`: floor content rendering, camera zoom, entry and return transitions, focus management, room scroll cues, and mobile overview hotspots.
- `assets/app.js`: tower framing, expansion and collapse, band selection, keyboard actions, and hash navigation.
- `assets/styles.css`: visual system and responsive layouts.
- `assets/floor-view.css`: fullscreen floor plans, room layouts, bounded desktop scrolling, mobile layouts, and camera transition styling.
- `index.html`: tower entry screen, document metadata, fullscreen floor dialog, and JavaScript fallback.
- `assets/eric-hsu-resume.pdf`: downloadable résumé. Replace this file to update the download.

Band IDs are `about`, `projects`, `experience`, `resume`, and `contact`. Keep these IDs consistent across the content file, skyscraper targets, floor content, and plan layouts. The order of rooms in `floor-content.js` matches the room positions in `floor-plans.js`.

`#explore` opens the expanded structure. Direct URLs such as `/#projects` open the corresponding floor plan. **Back to tower** or Escape reverses the camera transition and restores focus to the selected height band. **Collapse structure** returns to the initial tower view. Previous and next floor links, browser history, and direct hashes support moving between sections.

## Completed scope

The current scope includes the responsive portfolio foundation, supplied résumé content, downloadable PDF, original blue wireframe skyscraper, animated expansion, and five selectable height bands. Each selection zooms toward its segment before revealing an architectural floor plan. About, Experience, Résumé, and Contact each use four rooms; Projects uses a main workshop and two smaller rooms. The initial tower view keeps section labels hidden until the structure expands.

On desktop, HTML content sits inside the plan's rooms, with scrollable room bodies and overflow cues when needed. On mobile, an overview plan has numbered hotspots that jump to readable rooms stacked below it. Keyboard controls, focus restoration, and reduced-motion preferences are supported. The tower, floor plans, and camera effect use procedural SVG, JavaScript, and CSS transforms without dependencies or external font requests.

## GitHub Pages

This repository is structured for the root of `bshwao.github.io`. When ready to publish, push the files, then choose the desired branch and `/(root)` in **Settings → Pages → Deploy from a branch**. `.nojekyll` lets GitHub serve the files directly. All local asset paths are relative.

The site is available for local preview. Deployment has not been configured or triggered.
