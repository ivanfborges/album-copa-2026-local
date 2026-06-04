# Local brand images

This folder supports optional local images used by the app UI.

Use these exact filenames when you want the images to appear:

- `sidebar-mark.png`: small logo used beside the "Tracker local" text in the sidebar.
- `custom-mark.png`: main logo used in the dashboard identity card.
- `dashboard-lower-art.png`: optional album-cover style image used in the dashboard identity card. If this file is missing, the app falls back to `custom-mark.png` and then `app-mark.svg`.
- `sidebar-art.png`: optional ball image shown in the lower-right dashboard area.
- `sidebar-feature-art.png`: optional mascot image shown in the lower sidebar area. If this file is missing, the app also accepts the legacy `dashboard-side-art.png`.

These custom image files are ignored by Git so personal or licensed assets do not get published by accident.

Supported extensions depend on the browser, but `.png`, `.jpg`, `.jpeg`, `.webp`, and `.svg` are the safest choices.
