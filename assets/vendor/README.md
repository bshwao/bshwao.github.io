# Vendored Dependencies

This directory contains Three.js **0.180.0** and its OrbitControls module, sourced from the `three@0.180.0` npm package.

| File | Purpose |
| --- | --- |
| [three.module.min.js](three.module.min.js) | Production ES module entry point |
| [three.core.min.js](three.core.min.js) | Core implementation |
| [OrbitControls.js](OrbitControls.js) | Camera orbit and zoom controls |
| [LICENSE](LICENSE) | Original MIT license |

OrbitControls imports `./three.module.min.js` instead of the package specifier `three`. This is the local integration adjustment.

Serving these files from the repository removes the need for a runtime CDN or a deployment build step. Preserve the upstream license and keep the modules and controls on matching versions when updating.
