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
| `hero-02.html` | `mocks-hero-02.png` | post 02 cover (real step-02 screenshots) |
| `img-01-cantdo.html` | `mocks-01-accounts.png` | post 01: the six-accounts card |
| `img-01-android.html` | `mocks-01-android.png` | post 01: real --android terminal output |
| — | `shot-02-home.png`, `shot-02-discover.png` | real simulator screenshots of the step-02 shell |
| `hero-03.html` | `mocks-hero-03.png` | post 03 cover (real rollout terminal + live app screenshot) |
| — | `shot-03-healthy.png` | real screenshot: Backend · healthy from the live API |
| `hero-04.html` | `mocks-hero-04.png` | post 04 cover (401s terminal + the app greeting you by name) |
| `img-04-learns.html` | `mocks-04-learns.png` | post 04: sign-in → tutorial → named Home (real screenshots) |
| `img-04-race.html` | `mocks-04-race.png` | post 04: the CREATE_FAILED IAM-race terminal |
| — | `shot-04-signin.png`, `shot-04-verify.png`, `shot-04-onboarding.png`, `shot-04-home.png` | real simulator screenshots of the step-04 auth flow |
| `hero-05.html` | `mocks-hero-05.png` | post 05 cover (the working Settings screen + the delete-for-good terminal) |
| `img-05-account.html` | `mocks-05-account.png` | post 05: edit yourself / erase yourself (real Settings + delete modal) |
| `img-05-delete.html` | `mocks-05-delete.png` | post 05: the three deletion decisions terminal |
| — | `shot-05-settings.png`, `shot-05-delete.png`, `shot-05-birthday.png` | real simulator screenshots of the step-05 profile flow |

Re-render after editing a page (adjust `--window-size` to the page):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless \
  --disable-gpu --screenshot=mocks-iphone.png --window-size=1440,2740 \
  --hide-scrollbars "file://$PWD/iphone.html"
```
