# Threshold

Threshold is a local-first React app that helps someone rehearse one hard
message, choose one real-world step, and log real human contact. Its product
goal is intentionally unusual: success means people need the app less over time.

## Status

This repository now contains the production scaffold for the original
`Threshold-1.jsx` prototype:

- React 19 and Vite
- local browser storage for contact logs and usage trend data
- no browser-side AI provider secrets
- GitHub Releases update checks inside the app
- GitHub Actions for CI, Pages deployment, and tagged releases

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
git tag v0.1.1
git push origin v0.1.1
```

The release workflow builds the app, creates a zipped `dist` artifact, and
publishes a GitHub Release. The Pages workflow deploys `main` to GitHub Pages
with `BASE_PATH=/threshold/`.

## Privacy Shape

Threshold stores logs in the browser with `localStorage`. There is no account
system and no remote data sync in this version.

## License

Choose a project license before accepting outside contributions.
