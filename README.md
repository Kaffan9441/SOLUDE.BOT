# SoluDe.bot — Marketing Site

Static marketing site for SoluDe.bot: ROS2 robotics × PLC industrial integration.

## Structure

```
index.html       — industrial automation homepage (hero, mission, capabilities, agtech, process, contact)
cleaning.html    — SoluDe Clean product line and model enquiries
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
- The contact forms validate name/email and open a prefilled draft to architecture@solude.bot. Visitors must send the email themselves; the site does not store or submit enquiries.
- The hero animation pauses when scrolled off-screen and renders a static frame for users with
  `prefers-reduced-motion` enabled.

## SoluDe Clean

`cleaning.html` introduces the SoluDe Clean 55 / 80 floor-care line, linked from the homepage and navigation. See [implementation and product provenance](docs/solude-clean.md) for specification sources, image-generation details, and enquiry behavior.

## SoluDe Access

`access.html` introduces Guide 55, Gate S2, Pass Mobile, and Serve T5, with model-specific email enquiries. The homepage and shared navigation connect all product lines. See [product sources and visualization details](docs/solude-access.md) for manufacturer mappings and configuration limits.
