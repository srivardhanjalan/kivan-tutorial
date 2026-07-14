# Design mocks

Pixel-accurate HTML mocks of the end-user experience, built from the app's
real design tokens (see `mocks.css`). The PNGs are rendered from these pages
and embedded in the root README and the Medium posts.

| Source | Render | Shows |
|---|---|---|
| `iphone.html` | `mocks-iphone.png` | all seven iPhone screens |
| `ipad.html` | `mocks-ipad.png` | iPad frames, two-up (adaptive grids) |
| `android.html` | `mocks-android.png` | Android frames (system chrome) |
| `hero.html` | `mocks-hero.png` | series cover, 1500×750 (Medium 2:1) |
| `hero-01.html` | `mocks-hero-01.png` | post 01 cover (terminal) |

Re-render after editing a page (adjust `--window-size` to the page):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --screenshot=mocks-iphone.png --window-size=1440,2740 \
  --hide-scrollbars "file://$PWD/iphone.html"
```
