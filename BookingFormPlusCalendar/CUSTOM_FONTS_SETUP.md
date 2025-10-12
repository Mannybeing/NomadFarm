# Custom Fonts Setup Guide

## How to Use Your Custom .otf Fonts

### Step 1: Add Your Font Files
1. Copy your `.otf` font files to the `public/fonts/` directory
2. Rename them to match the names in the CSS:
   - `your-heading-font.otf` - for headings (h1, h2, etc.)
   - `your-body-font.otf` - for body text
   - `your-heading-font-bold.otf` - for bold headings (optional)

### Step 2: Update Font Names in CSS
Open `src/styles/NomadBooking.css` and update the font file names in the `@font-face` declarations:

```css
@font-face {
    font-family: 'CustomHeadingFont';
    src: url('/fonts/YOUR_ACTUAL_HEADING_FONT_NAME.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}

@font-face {
    font-family: 'CustomBodyFont';
    src: url('/fonts/YOUR_ACTUAL_BODY_FONT_NAME.otf') format('opentype');
    font-weight: normal;
    font-style: normal;
    font-display: swap;
}
```

### Step 3: Test Your Fonts
1. Start your development server: `npm start`
2. Check if fonts load in browser dev tools → Network tab
3. If fonts don't load, check:
   - File paths are correct
   - Font files are in `public/fonts/` directory
   - Font file names match exactly in CSS

### Current Font Stack
- **Headings**: CustomHeadingFont → Amatic SC → Merriweather → serif
- **Body Text**: CustomBodyFont → Space Grotesk → Inter → system fonts

### Alternative Method: Using src/assets
If you prefer, you can also put fonts in `src/assets/fonts/` and import them differently:

```css
@font-face {
    font-family: 'CustomFont';
    src: url('./assets/fonts/your-font.otf') format('opentype');
}
```

### Supported Font Formats
- `.otf` (OpenType) ✅
- `.ttf` (TrueType) ✅
- `.woff` (Web Open Font Format) ✅
- `.woff2` (Web Open Font Format 2) ✅ (best performance)

### Performance Tips
1. Use `font-display: swap` for better loading performance
2. Consider converting .otf to .woff2 for better compression
3. Preload important fonts in `public/index.html`:
```html
<link rel="preload" href="/fonts/your-font.otf" as="font" type="font/otf" crossorigin>
```
