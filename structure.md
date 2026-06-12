# Project Structure

## Layout
```
/
├── index.html          # Single entry point — all UI markup
├── css/
│   └── style.css       # All styles (only one CSS file allowed)
├── js/
│   └── app.js          # All logic (only one JS file allowed)
├── .kiro/
│   └── steering/       # Kiro AI steering documents
└── README.md
```

## Rules
- **Only 1 CSS file** inside `css/` — do not add more stylesheets
- **Only 1 JS file** inside `js/` — do not split into modules or add more scripts
- No `node_modules`, no package managers, no build output directories
- No backend files — everything runs in the browser

## Conventions
- CSS custom properties (`--var-name`) defined in `:root` for all design tokens (colors, radius, shadow)
- Category colors/emojis are defined once in `CAT_COLORS` and `CAT_EMOJI` objects in `app.js`
- LocalStorage keys are constants at the top of `app.js`
- All rendering functions are named `render*()` and called via a single `renderAll()` orchestrator
