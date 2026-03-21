/**
 * Decorative elements section — mode-aware gradient text, accent dividers, SVG icons.
 */
import type { TemplatePalette } from '../../templates';

export function buildDecorativeSection(pal?: TemplatePalette): string {
  const mode = pal?.mode ?? 'dark';

  const heroTextRecipe = mode === 'dark'
    ? `### Gradient Text (for hero titles on DARK backgrounds only):
\`\`\`html
<h1 style="background:linear-gradient(135deg,${pal?.heading ?? '#fff'},${pal?.primary ?? '#3b82f6'}); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">
\`\`\``
    : `### Hero Title (LIGHT mode — solid color, NO gradient text):
\`\`\`html
<h1 style="color:${pal?.heading ?? '#0f172a'}; font-weight:700;">Title Here</h1>
<div style="width:48px; height:3px; background:${pal?.primary ?? '#3b82f6'}; border-radius:2px; margin:0.8rem 0;"></div>
\`\`\`
**IMPORTANT:** Do NOT use gradient text on light backgrounds. The contrast is too low and it looks washed out. Use solid heading color with a colored accent divider instead.`;

  const geometricDecoration = mode === 'dark'
    ? `### Geometric Decorations (floating glow shapes for dark mode):
\`\`\`html
<div style="position:absolute; top:-80px; right:-60px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,${pal?.primary ?? '#3b82f6'}15,transparent 70%); pointer-events:none;"></div>
\`\`\``
    : `### Geometric Decorations (subtle shapes for light mode):
\`\`\`html
<div style="position:absolute; top:-80px; right:-60px; width:200px; height:200px; border-radius:50%; background:radial-gradient(circle,${pal?.primary ?? '#3b82f6'}08,transparent 70%); pointer-events:none;"></div>
\`\`\`
Use very subtle opacity (08 hex = 3%) for geometric shapes on light backgrounds.`;

  return `## DECORATIVE ELEMENTS — CSS-Only Visual Richness

Instead of images, use these techniques to make slides visually stunning:

${heroTextRecipe}

### Accent Dividers (place below every h2):
\`\`\`html
<div style="width:48px; height:3px; background:var(--primary); border-radius:2px; margin:0.8rem 0 1.5rem;"></div>
\`\`\`

### Icon Containers (solid tinted background + inline SVG):
\`\`\`html
<div style="width:44px; height:44px; border-radius:10px; background:rgba(${pal?.primary ?? '59,130,246'}${mode === 'dark' ? ',0.10' : ',0.08'}); display:flex; align-items:center; justify-content:center;">
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${pal?.primary ?? '#3b82f6'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">...</svg>
</div>
\`\`\`

${geometricDecoration}

### CSS-Only Illustrations (abstract shapes):
\`\`\`html
<div style="width:300px; height:300px; position:relative;">
  <div style="position:absolute; inset:20%; border-radius:30% 70% 70% 30% / 30% 30% 70% 70%; background:linear-gradient(135deg,var(--primary),var(--accent)); opacity:${mode === 'dark' ? '0.2' : '0.08'};"></div>
  <div style="position:absolute; inset:10%; border:2px solid ${pal?.border ?? 'rgba(255,255,255,0.1)'}; border-radius:50%;"></div>
</div>
\`\`\`

### Progress / Gauge (conic gradient):
\`\`\`html
<div style="width:100px; height:100px; border-radius:50%; background:conic-gradient(var(--primary) 0% 73%, ${pal?.surface ?? 'rgba(255,255,255,0.05)'} 73% 100%); display:flex; align-items:center; justify-content:center;">
  <div style="width:70px; height:70px; border-radius:50%; background:${pal?.bg ?? '#0f172a'}; display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--primary); font-size:1.1em;">73%</div>
</div>
\`\`\`

### Inline SVG Icons (use instead of emoji for premium feel):
Common icons — copy these exactly:
- **Lightning:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>\`
- **Lock:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>\`
- **Chart:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>\`
- **Check:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>\`
- **Star:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>\`
- **Users:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>\`
- **Globe:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>\`
- **Arrow Right:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>\`
- **Code:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>\`
- **Layers:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>\`
- **Rocket:** \`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 3 0 3 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-3 0-3"/></svg>\`

### Bootstrap Icons CDN (for broader icon coverage):
When you need icons beyond the inline SVGs above, use Bootstrap Icons. The CDN link is already included in the output format.
Usage: \`<i class="bi bi-ICON-NAME" style="font-size:24px; color:var(--primary);"></i>\`

**CRITICAL:** Only use icon names from this list. Do NOT guess or invent icon names — if a name is not listed here, it does not exist. There is no "foot-fill", "paw-fill", "dog", "cat", or "baby" icon.

**Business & Finance:** briefcase, briefcase-fill, building, building-fill, buildings, buildings-fill, bank, bank2, cash, cash-coin, cash-stack, credit-card, credit-card-fill, piggy-bank, piggy-bank-fill, receipt, wallet, wallet-fill, wallet2, coin, currency-dollar, currency-euro, currency-bitcoin, currency-exchange
**Charts & Data:** bar-chart, bar-chart-fill, bar-chart-line, bar-chart-line-fill, bar-chart-steps, pie-chart, pie-chart-fill, graph-up, graph-up-arrow, graph-down, graph-down-arrow, activity, clipboard-data, clipboard-data-fill, diagram-2, diagram-2-fill, diagram-3, diagram-3-fill, kanban, kanban-fill, speedometer, speedometer2
**People:** person, person-fill, person-circle, person-check, person-check-fill, person-plus, person-plus-fill, person-heart, person-arms-up, person-raised-hand, person-workspace, person-gear, person-badge, person-badge-fill, person-video, person-video2, person-walking, people, people-fill
**Communication:** chat, chat-fill, chat-dots, chat-dots-fill, chat-heart, chat-heart-fill, chat-left-text, chat-left-text-fill, chat-square-text, chat-square-text-fill, envelope, envelope-fill, envelope-open, envelope-open-fill, envelope-heart, megaphone, megaphone-fill, telephone, telephone-fill, mic, mic-fill, broadcast, broadcast-pin, send, send-fill
**Arrows & Navigation:** arrow-up, arrow-down, arrow-left, arrow-right, arrow-up-right, arrow-up-circle, arrow-up-circle-fill, arrow-right-circle, arrow-right-circle-fill, arrow-left-right, arrow-down-up, arrow-clockwise, arrow-counterclockwise, arrow-repeat, arrow-return-left, arrow-return-right, chevron-up, chevron-down, chevron-left, chevron-right, chevron-double-right, box-arrow-up-right, arrows-fullscreen, arrows-move
**UI Elements:** check, check-lg, check2, check-all, check-circle, check-circle-fill, check-square, check-square-fill, plus, plus-lg, plus-circle, plus-circle-fill, dash, dash-circle, x, x-lg, x-circle, x-circle-fill, exclamation-triangle, exclamation-triangle-fill, exclamation-circle, exclamation-circle-fill, info-circle, info-circle-fill, question-circle, question-circle-fill, search, filter, funnel, funnel-fill
**Technology:** laptop, laptop-fill, display, display-fill, phone, phone-fill, phone-landscape, cpu, cpu-fill, gpu-card, memory, motherboard, hdd, hdd-fill, hdd-network, hdd-stack, device-hdd, device-ssd, keyboard, keyboard-fill, mouse, mouse-fill, headphones, headset, headset-vr, camera, camera-fill, camera-video, camera-video-fill, bluetooth, wifi, ethernet, cast, robot, smartwatch, controller
**Security:** lock, lock-fill, unlock, unlock-fill, key, key-fill, shield, shield-fill, shield-check, shield-fill-check, shield-lock, shield-lock-fill, shield-exclamation, shield-x, incognito, fingerprint, eye, eye-fill, eye-slash, eye-slash-fill, passport, passport-fill
**Hearts & Emotions:** heart, heart-fill, heart-half, heart-pulse, heart-pulse-fill, heartbreak, heartbreak-fill, hearts, emoji-smile, emoji-smile-fill, emoji-heart-eyes, emoji-heart-eyes-fill, emoji-laughing, emoji-laughing-fill, emoji-sunglasses, emoji-sunglasses-fill, emoji-wink, emoji-wink-fill, hand-thumbs-up, hand-thumbs-up-fill, hand-thumbs-down, hand-thumbs-down-fill, balloon, balloon-fill, balloon-heart, balloon-heart-fill
**Files & Docs:** file-text, file-text-fill, file-code, file-code-fill, file-pdf, file-pdf-fill, file-earmark, file-earmark-fill, file-earmark-text, file-earmark-check, folder, folder-fill, folder2-open, journal-text, journal-bookmark-fill, book, book-fill, book-half, newspaper, clipboard, clipboard-fill, clipboard-check, clipboard-check-fill
**Nature & Weather:** cloud, cloud-fill, cloud-sun, cloud-sun-fill, cloud-rain, cloud-rain-fill, cloud-lightning, cloud-lightning-fill, cloud-arrow-up, cloud-arrow-up-fill, cloud-download, cloud-upload, sun, sun-fill, moon, moon-fill, moon-stars, moon-stars-fill, stars, snow, snow2, snow3, droplet, droplet-fill, flower1, flower2, flower3, tree, tree-fill, leaf, leaf-fill, fire, water, moisture, wind, lightning, lightning-fill, lightning-charge, lightning-charge-fill, hurricane, rainbow, brightness-high, brightness-high-fill, thermometer, thermometer-half
**Places:** house, house-fill, house-door, house-door-fill, house-heart, house-heart-fill, hospital, hospital-fill, globe, globe2, globe-americas, globe-europe-africa, geo, geo-alt, geo-alt-fill, compass, compass-fill, map, map-fill, pin-map, pin-map-fill, signpost, signpost-fill
**Objects & Tools:** gear, gear-fill, gear-wide-connected, wrench, wrench-adjustable, wrench-adjustable-fill, hammer, tools, scissors, lightbulb, lightbulb-fill, lightbulb-off, lightbulb-off-fill, lamp, lamp-fill, magnet, magnet-fill, ladder, binoculars, binoculars-fill, bell, bell-fill, bell-slash, bell-slash-fill, alarm, alarm-fill, hourglass, hourglass-split, hourglass-bottom, clock, clock-fill, clock-history, stopwatch, stopwatch-fill, watch
**Awards & Status:** trophy, trophy-fill, award, award-fill, star, star-fill, star-half, patch-check, patch-check-fill, patch-plus, patch-plus-fill, flag, flag-fill, bookmark, bookmark-fill, bookmark-star, bookmark-star-fill, gem, gift, gift-fill, hand-index-thumb, hand-index-thumb-fill
**Shapes & Design:** circle, circle-fill, square, square-fill, diamond, diamond-fill, hexagon, hexagon-fill, triangle, triangle-fill, pentagon, pentagon-fill, octagon, octagon-fill, palette, palette-fill, brush, brush-fill, pen, pen-fill, pencil, pencil-fill, pencil-square, paint-bucket, eyedropper, crop, aspect-ratio, grid, grid-fill, grid-3x3, columns, columns-gap, border-all, border-style, image, image-fill, images, easel, easel-fill, magic
**Media:** play, play-fill, play-circle, play-circle-fill, pause, pause-fill, stop, stop-fill, skip-forward, skip-forward-fill, skip-backward, skip-backward-fill, volume-up, volume-up-fill, volume-down, volume-down-fill, volume-mute, volume-mute-fill, music-note, music-note-beamed, music-note-list, film, camera-reels, camera-reels-fill, disc, disc-fill, cassette
**Database & Cloud:** database, database-fill, database-add, database-check, database-gear, database-lock, server, archive, archive-fill, box, box-fill, box-seam, box-seam-fill, boxes, inbox, inbox-fill, inboxes, inboxes-fill, floppy, floppy-fill, save, save-fill, download, upload, cloud-download, cloud-upload
**Social & Brands:** github, google, facebook, instagram, linkedin, twitter, twitter-x, youtube, discord, dribbble, dropbox, paypal, pinterest, medium, mastodon, microsoft, microsoft-teams, apple, android, android2, amazon, spotify, reddit, slack, telegram, tiktok, twitch, whatsapp, meta, bluesky, threads
**Numbers:** 0-circle through 9-circle, 0-circle-fill through 9-circle-fill, 0-square through 9-square, 0-square-fill through 9-square-fill, 123, hash
**Layout:** layout-sidebar, layout-sidebar-reverse, layout-split, layout-text-sidebar, layout-text-window, layout-three-columns, list, list-check, list-ol, list-ul, list-task, list-nested, list-stars, list-columns, card-checklist, card-heading, card-image, card-list, card-text, collection, collection-fill, bookshelf, easel2, easel3
**Misc:** cup, cup-fill, cup-hot, cup-hot-fill, cup-straw, cake, cake-fill, cake2, cake2-fill, egg, egg-fill, basket, basket-fill, bag, bag-fill, bag-heart, bag-heart-fill, cart, cart-fill, cart-check, cart-plus, handbag, handbag-fill, tag, tag-fill, tags, tags-fill, ticket, ticket-fill, qr-code, qr-code-scan, upc, upc-scan, puzzle, puzzle-fill, recycle, trash, trash-fill, trash2, trash2-fill, bug, bug-fill, signpost, signpost-fill, sign-stop, sign-stop-fill, stoplights, stoplights-fill

### Emoji Guide (for casual, friendly, or playful slides):
Emoji works great for informal presentations. Use them at 1.5-2em size for card icons, or 2-4em for hero accents.
\`\`\`html
<span style="font-size:2em;">🚀</span>
\`\`\`

**IMPORTANT emoji rules:**
- Emoji render differently on each OS — stick to universally well-rendered ones below
- Never use emoji as the ONLY visual on a slide — pair with text content
- Emoji works best in light/playful presentations, NOT corporate/formal ones
- Wrap in a \`<span>\` with explicit \`font-size\` — never rely on inherited sizing

**Recommended emoji by category (cross-platform safe):**
- **Concepts:** 💡 (idea) 🎯 (target/goal) 🚀 (launch/growth) ⭐ (quality/star) ✨ (highlight) 🔥 (hot/trending) 💎 (premium) 🏆 (achievement) 🎉 (celebration) 🎁 (gift/bonus)
- **Business:** 📊 (chart) 📈 (growth) 📉 (decline) 💰 (money) 💵 (dollar) 🏢 (office) 📋 (clipboard) 📌 (pin) 📎 (paperclip) 🗂️ (folder) 📁 (folders) 🤝 (handshake) 💼 (briefcase)
- **People:** 👤 (person) 👥 (group) 🙋 (raised hand) 🤔 (thinking) 😊 (happy) 😍 (love) 👍 (thumbs up) 👏 (clap) 💪 (strength) 🧠 (brain) 🫶 (heart hands)
- **Tech:** 💻 (laptop) 📱 (phone) ⚙️ (gear) 🔧 (wrench) 🛠️ (tools) 🔌 (plug) 📡 (satellite) 🖥️ (desktop) ⌨️ (keyboard) 🔒 (lock) 🔑 (key) 🛡️ (shield) 🤖 (robot)
- **Nature:** 🌍 (earth) 🌱 (seedling) 🌿 (herb) 🌸 (flower) 🌻 (sunflower) 🌳 (tree) 🍃 (leaves) ☀️ (sun) 🌙 (moon) ⛅ (cloud/sun) 🌊 (wave) ❄️ (snow) 🔥 (fire) 💧 (droplet) 🌈 (rainbow)
- **Animals (popular):** 🐶 (dog) 🐱 (cat) 🐻 (bear) 🦊 (fox) 🐧 (penguin) 🦁 (lion) 🐢 (turtle) 🐬 (dolphin) 🦋 (butterfly) 🐝 (bee) 🦄 (unicorn) 🐾 (paw prints)
- **Arrows & Symbols:** ➡️ ⬅️ ⬆️ ⬇️ ↗️ ↘️ 🔄 (cycle) ✅ (check) ❌ (cross) ⚡ (lightning) ❤️ (heart) 💜 (purple heart) 💙 (blue heart) 💚 (green heart) 🔴 🟢 🔵 🟡 ⚪ ⚫
- **Numbers & Time:** 1️⃣ 2️⃣ 3️⃣ 4️⃣ 5️⃣ ⏰ (alarm clock) ⏱️ (stopwatch) 📅 (calendar) 🕐 through 🕛 (clock faces)
- **Food & Drink (for casual):** ☕ (coffee) 🍕 (pizza) 🎂 (cake) 🍎 (apple) 🥂 (cheers) 🧁 (cupcake)
- **Health & Wellness:** ❤️ (heart) 💪 (strength) 🧘 (meditation) 🏃 (running) 🩺 (stethoscope) 💊 (medicine) 😴 (sleep) 🧠 (brain) 🫀 (anatomical heart)`;
}
