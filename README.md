# xavierhillman

## Environment

Create a `.env` file (you can copy `.env.example`) to control build behavior.

Available variables:
- `ENV`: `DEV` or `PROD` (defaults to `DEV`) – controls `basePath` and `assetPrefix`.

In DEV, links and assets are prefixed with `/dist` for easier local viewing.

## Scripts

```sh
npm run build
npm run clean
```

## Assets

Place static files (CSS, images, favicon) in `public/`. They will be copied to `dist/` on build.