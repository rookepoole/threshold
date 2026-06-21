# Threshold

Threshold is a local-first React app that helps someone rehearse one hard
message, choose one real-world step, and log real human contact. Its product
goal is intentionally unusual: success means people need the app less over time.

[![Install Threshold](https://img.shields.io/badge/Install-Threshold-5b7b6e?style=for-the-badge)](https://rookepoole.github.io/threshold/)

## Status

This repository now contains the production scaffold for the original
`Threshold-1.jsx` prototype:

- React 19 and Vite
- local browser storage for contact logs and usage trend data
- installable PWA support for desktop and mobile browsers
- no browser-side AI provider secrets
- GitHub Releases update checks inside the app
- GitHub Actions for CI, Pages deployment, and tagged releases

## Install The App

Open the live app with the install button above, or go directly to:

<https://rookepoole.github.io/threshold/>

On Chrome, Edge, and most Android browsers, use Threshold's Install button.
On iPhone or iPad, open the Share sheet and choose Add to Home Screen.

The installed app keeps the same local browser data model: notes stay on the
device where they were created.

## Development

```bash
pnpm install
pnpm dev
```

Quality checks:

```bash
pnpm lint
pnpm test
pnpm build
```

## Releases And In-App Updates

The app reads the latest public release from:

```text
https://api.github.com/repos/rookepoole/threshold/releases/latest
```

The running version comes from `package.json`. When a newer GitHub release tag
exists, the Updates tab shows it and lets the user refresh deployed app assets.

Publish a release by tagging a version:

```bash
git tag v0.1.6
git push origin v0.1.6
```

The release workflow builds the app, creates a zipped `dist` artifact, and
publishes a GitHub Release. The Pages workflow deploys `main` to GitHub Pages
with `BASE_PATH=/threshold/`.

For user-visible fixes, bump `package.json`, bump `public/sw.js`'s cache
version, and publish a matching release tag so installed apps can detect and
pull the new build.

## Contributing

Contributions are welcome. Open an issue or pull request with the change you
want to make, and run the quality checks before submitting larger updates.

## Privacy Shape

Threshold stores logs in the browser with `localStorage`. There is no account
system and no remote data sync in this version.

## License

Threshold is open source under the MIT License. See [LICENSE](./LICENSE).
