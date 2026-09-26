# SoluDe Clean implementation

Adds an autonomous floor-care product line to the existing industrial automation site. `cleaning.html` shares the Archivo / IBM Plex Mono typography, charcoal palette, lime accent, navigation, and enquiry interactions with the homepage. Proposed commercial names: SoluDe Clean 55 and SoluDe Clean 80.

## Product source

Specifications were checked on 26 September 2026 against https://www.aotbot.com/en/aotingbots.html (SW55 A and SW80 A). Coverage figures are manufacturer ratings, not field-tested guarantees. Runtime shown is hard-floor runtime, not the longer silent-mode figure. The 55's cleaning widths correspond to its two side-brush options. Do not imply ROS2, PLC, or WMS compatibility for these robots without integration validation.

## Product visualization

`img/solude-clean.png` was created with the built-in image generation tool as a proposed branding mockup, labeled in the UI. It is not a photograph of delivered SoluDe hardware. Source reference assets:
- https://www.aotbot.com/themes/Home/default_en/Public/images/sw55.png
- https://www.aotbot.com/themes/Home/default_en/Public/images/sw80.png

The manufacturer's second image is visually labeled SW80 Pro, while its specification table is SW80 A. The page therefore identifies imagery as a proposed visualization and specifications as the underlying A platforms; confirm final hardware appearance and finish with the supplier for production collateral.

Final image prompt:
> Use case: precise-object-edit / product-mockup. Create a single wide premium product lineup image for SOLUDE.BOT's white-label cleaning robotics website. Both reference images are edit targets. Preserve the exact mechanical shapes, proportions, sensors, wheels, brushes and silhouette of each robot; compact SW55 on left and larger SW80 on right. Rebrand white body panels to satin dark charcoal, replace every original AOTING/BOTS/SW brand text with small crisp 'SOLUDE.BOT' wordmark, replace teal accents and brush bristles with muted lime #c8ff4d. No other text or original logos. Photorealistic studio product render, black #0b0c0d seamless background and subtle floor, restrained lime rim light, beautiful realistic material detail, entire robots visible, generous margins. Landscape 1536x1024. This is a proposed branding mockup, not a redesigned robot.

## Enquiries

Both forms validate name and email, then open a prefilled mailto draft addressed to the site's existing `architecture@solude.bot` address. Visitors must send the draft themselves. The form does not claim delivery and retains all input. No backend, account creation, pricing, or booking system is implied. Mailbox deliverability has not been verified. Removed the existing placeholder 555 telephone number.

## Preview

Run `python3 -m http.server 8000` from the repository, then open `/cleaning.html` or `/index.html`. There is no build step.
