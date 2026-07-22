# SoluDe.bot — Marketing Site

Static single-page site for SoluDe.bot: ROS2 robotics × PLC industrial integration.

## Structure

```
index.html       — all page content (hero, mission, capabilities, agtech, process, contact)
css/styles.css   — theme, layout, responsive breakpoints (960px / 720px), reduced-motion support
js/main.js       — hero canvas (robotic-arm IK animation), scroll reveals, mobile nav, contact form
```

## Run it

No build step — open `index.html` directly in a browser, or serve locally:

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

## Notes

- Fonts (Archivo, IBM Plex Mono) load from Google Fonts; everything else is self-contained.
- The contact form is front-end only — wire the submit handler in `js/main.js` to a backend or
  form service (e.g. Formspree) when ready.
- The hero animation pauses when scrolled off-screen and renders a static frame for users with
  `prefers-reduced-motion` enabled.
