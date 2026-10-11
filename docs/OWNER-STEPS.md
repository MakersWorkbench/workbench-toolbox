# What the owner needs to do, and what it costs

Everything in this repo builds and runs for free. These steps are only for removing install warnings or listing in app stores.

## 1. GitHub settings (free, one time)

1. **Pages:** Settings, Pages, Source: **GitHub Actions**. After the `Deploy web app to GitHub Pages` workflow runs on `main`, the live URL is `https://makersworkbench.github.io/workbench-toolbox/`.
2. **Actions permissions:** Settings, Actions, General, Workflow permissions: **Read and write** (the release job needs it).
3. Merge the working branch to `main`, then push a tag (`git tag v1.0.0 && git push origin v1.0.0`) to get a Release with installers.

## 2. Windows code signing (removes the SmartScreen warning)

* Buy a code-signing certificate. An OV certificate is roughly 200 to 400 USD per year. An EV certificate (which clears SmartScreen faster) is roughly 300 to 600 USD per year. Microsoft's Trusted Signing service is about 10 USD per month for eligible individuals and businesses.
* Add the certificate to GitHub secrets and set the Tauri signing options. See the Tauri docs page "Windows Code Signing".

## 3. Mac code signing and notarization (removes the Gatekeeper warning)

* Join the **Apple Developer Program**: 99 USD per year.
* Create a "Developer ID Application" certificate, export it as .p12, and add these GitHub secrets: `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD` (an app-specific password), `APPLE_TEAM_ID`. Tauri signs and notarizes when these are present. See the Tauri docs page "macOS Code Signing".

## 4. iPhone App Store

* Needs the same Apple Developer Program account (99 USD per year) and a Mac with Xcode.
* On the Mac: `npm install && npx cap sync ios && npx cap open ios`, set the Team under Signing and Capabilities, set the bundle id (`com.themakersworkbench.toolbox` is a placeholder you may change), then Product, Archive, and upload with Xcode Organizer to App Store Connect.
* Apple also requires a privacy policy URL (this app collects nothing, so the policy is one paragraph), screenshots, and passing review. Apple sometimes rejects apps that are only a website wrapper (guideline 4.2). This app works offline and ships its own code, which helps, but approval is not guaranteed.
* Until then, iPhone users install the PWA from Safari (Share, Add to Home Screen).

## 5. Google Play Store (Android)

* Google Play developer account: **25 USD, one time**.
* Create an upload key once: `keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload`. Keep it safe and back it up.
* Add the keystore and passwords as GitHub secrets and add a `signingConfigs.release` block in `android/app/build.gradle`, then build `bundleRelease` to get a signed `.aab` and upload it in Play Console. The unsigned `.aab` in Releases is not accepted by Google Play.
* New personal accounts must run a closed test with at least 12 testers for 14 days before they can publish to production. Play also asks for a privacy policy URL and a data-safety form (answer: no data collected).
* The Play Store alternative with no fee is sideloading the `.apk`, or F-Droid.

## 6. Cost summary

| Item | Cost |
| --- | --- |
| Web app on GitHub Pages, all installers, sideloaded APK | Free |
| Windows signing | about 10 to 600 USD per year, depending on option |
| Apple Developer Program (Mac signing and App Store) | 99 USD per year |
| Google Play developer account | 25 USD once |
