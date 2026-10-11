# Workbench Toolbox

One free app with every browser tool from [The Makers Workbench](https://www.themakersworkbench.com), in a single menu. It works fully offline, has no tracking, no analytics, no cookies and no affiliate links, and it is open source (Apache-2.0).

**Inside:** Component Marking Decoder (14 tabs), Electronics Calculators (20 calculators), Embedded Systems Toolkit, Power and Battery Tools, PCB and Wiring Tools (calculators for PCB traces, vias, spacing, and wire gauge), and Bench Tools (value converters, E-series finder, I2C address book, cheat sheets).

Hack The World & Make Awesome!

## Install

The easiest way on any device is the web app (a PWA, which means a "progressive web app": a website you can install like an app). Open the live page, then:

| Device | Steps |
| --- | --- |
| **Windows, Mac, Linux, Chromebook** (Chrome or Edge) | Open the web app and click the install icon at the right end of the address bar, or menu, then "Install Workbench Toolbox". |
| **Android** (Chrome) | Open the web app, tap the menu (three dots), then "Install app" or "Add to Home screen". |
| **iPhone and iPad** (Safari only) | Open the web app in **Safari**, tap the **Share** button (square with an arrow), scroll down, tap **Add to Home Screen**, then **Add**. Other iOS browsers cannot install it. |

After the first load it opens with no internet. When a new version is published, a "New version available" bar appears. Tap Reload.

### Installer files (Windows, Mac, Linux, Android)

Download from the [Releases page](https://github.com/MakersWorkbench/workbench-toolbox/releases).

| File | For |
| --- | --- |
| `.msi` or `-setup.exe` | Windows 10 and 11 |
| `.dmg` | macOS (Apple silicon and Intel) |
| `.AppImage` or `.deb` | Linux (AppImage: right-click, Properties, allow executing; or `chmod +x`) |
| `.apk` | Android sideloading (allow "install unknown apps" for your browser or file manager) |

The installers are **not code-signed** yet (signing costs money, see `docs/OWNER-STEPS.md`), so your system warns you the first time. The app is safe to open if you downloaded it from this repository's Releases page.

* **Windows SmartScreen** ("Windows protected your PC"): click **More info**, then **Run anyway**.
* **macOS Gatekeeper** ("cannot be opened because the developer cannot be verified"): drag the app to Applications, then right-click (or Control-click) it, choose **Open**, and click **Open** again. Or go to System Settings, Privacy and Security, scroll down, and click **Open Anyway**.
* **Android**: Play Protect may say the app is unrecognized. Tap **Install anyway**. The APK is signed with a debug key, which is fine for sideloading but means it cannot update an app installed from a different key.

## For developers

No build step is needed for the app itself: `www/` is plain HTML, CSS and JavaScript.

```
npm install
npm run serve          # http://127.0.0.1:8080/
npm run sync           # pull the latest six tools from GitHub, then: npm run build
npm run build          # regenerate www/registry.js (tool and tab list) and www/sw.js (offline file list)
npm test               # tool unit tests (node --test) + Playwright smoke tests in Chromium, offline
npm run screenshots    # screenshots/ at phone and desktop width, light and dark
```

Run `npm run build` after any change inside `www/`, because the service worker lists every file it caches.

| Folder | What it is |
| --- | --- |
| `www/` | The app (shell, vendored tools, icons, service worker) |
| `www/tools/<tool>/` | A copy of each tool repo, see `SOURCES.md` |
| `src-tauri/` | Desktop wrapper (Tauri 2) for Windows, Mac and Linux |
| `android/`, `ios/` | Capacitor projects (the iOS one is prepared but not built or released) |
| `scripts/` | Sync, index, service worker, icon and screenshot scripts |
| `tests/`, `e2e/` | Unit tests and Playwright tests |
| `.github/workflows/` | CI, GitHub Pages deploy, and installer builds |

To cut a release: bump the version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` and `android/app/build.gradle`, run `npm run build`, then push a tag such as `v1.0.1`. The `Build installers` workflow attaches the files to a GitHub Release.

### Tool names and writing rules

It is **Electronics Calculators** (the upstream repo is still called `circuit-calculators`). No em-dash characters anywhere (a test enforces it). Prices in USD. No network calls at runtime.

## iPhone and the App Store

See `docs/OWNER-STEPS.md`. In short: the PWA install above works today. A real App Store app needs an Apple Developer account (99 USD per year), and the Capacitor iOS project in `ios/` is ready to open in Xcode on a Mac.

## License

Apache License 2.0. See `LICENSE`, `NOTICE` and `SOURCES.md`. Each bundled tool keeps its own license files in `www/tools/<tool>/`.
