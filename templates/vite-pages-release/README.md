# Vite GitHub Pages Release Template

Production GitHub Pages deployment workflow with pre-deployment security scan.

Derived from patterns in [SpinnerCockpit](https://github.com/polerix/SpinnerCockpit) and [Touski](https://github.com/polerix/touski).

## Security Features

- Builds to `./dist` with configurable multi-page rollup options.
- Runs an automated secret scan verifying that no embedded API keys or tokens exist in client assets before uploading to Pages.
