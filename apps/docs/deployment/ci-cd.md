# CI/CD

Comic Shelf uses GitHub Actions for CI/CD and [release-please](https://github.com/googleapis/release-please) for automated releases.

## CI Pipeline

On every push and pull request to `main`, the CI workflow:

1. Installs dependencies (`npm ci`)
2. Runs lint, tests, and build via `nx affected`
3. Builds the Docker image (on main only)
4. Publishes to GitHub Container Registry (`ghcr.io`)

## Release Process

`release-please` automatically:
- Bumps versions based on Conventional Commits
- Generates `CHANGELOG.md`
- Creates a release PR
- Tags and publishes releases on merge

## Docs Deployment

Documentation is deployed to GitHub Pages automatically when `apps/docs/**` files change on `main`. See [the docs workflow](https://github.com/JaccoGoris/comic-shelf/blob/main/.github/workflows/docs.yml).
