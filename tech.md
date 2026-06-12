# Tech Stack

## Technology
- **HTML5** — semantic markup, single `index.html` entry point
- **CSS3** — one file: `css/style.css`; CSS custom properties (variables), flexbox, grid, animations
- **Vanilla JavaScript (ES6+)** — one file: `js/app.js`; strict mode, no frameworks or build tools
- **LocalStorage API** — all data persisted client-side under keys `ebv_expenses` and `ebv_budgets`

## No Build Step
This is a zero-dependency static web app. Open `index.html` directly in any modern browser — no `npm install`, no bundler, no server required.

## Running the App
```bash
# Option A: just open the file
start index.html

# Option B: simple local server (any tool works)
npx serve .
python -m http.server 8080
```

## Browser Compatibility
Chrome, Firefox, Edge, Safari (all modern versions). Uses only standard Web APIs.

## Version Control
- **Git** — standard VCS (`.git/`)
- **Jujutsu (jj)** — co-located VCS overlay (`.jj/`); use `jj` commands for commits and branches

## Common jj Commands
```bash
jj status          # show working copy status
jj diff            # show uncommitted changes
jj commit -m "..."  # commit current changes
jj log             # view commit history
jj new             # create a new change
```
