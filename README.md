# Heraldic website

A privacy-first React rebuild of the Heraldic website. It contains no trackers, ads, affiliate storefronts, or external embeds. When a visitor submits a message to Artem AI, that message is sent to OpenAI to generate a reply.

The keyboard is an always-visible prompt surface beneath the fixed monitor. Its keys type into the prompt. Artem AI is called only through the server endpoint; the browser never receives the OpenAI key. AI edits are restricted to the site's allowlisted plain-text copy fields.

## Local development

```sh
npm install
npm run dev
```

For Docker, put `OPENAI_API_KEY=...` in the workspace `.env.local` file. Compose injects it into the server container at runtime; `.env.local` is excluded from the image build context.

```sh
docker compose up --build --detach
```

## AWS Lambda deployment

The included AWS SAM template packages only the built site and Lambda handler. For AWS, first store the API key in AWS Secrets Manager, then supply that secret's ARN to `OpenAISecretArn` during `sam deploy --guided`. The key is resolved at Lambda runtime and is not copied from the local `.env.local` file. API Gateway applies a shared burst/rate cap, and the Lambda handler adds a per-IP sliding-window chat limit with short message history.

```sh
npm ci
npm run build
sam build
sam deploy --guided
```

The Lambda handler sets a restrictive Content Security Policy, blocks framing, disables unneeded browser permissions, uses HTTPS-only transport policy, safely normalizes request paths, and serves no third-party resources.

## SEO and browser-local design

### Media posters

`/media/` includes first-page image previews and the two unchanged original poster PDFs. Local Node/Docker delivery streams the PDFs with HEAD and byte-range support; files are not fetched until a visitor selects a PDF link. Original archive content is preserved, including historic branding and contact information.

For AWS, upload `public/media/GTC2017MEAposter.pdf` and `public/media/Mise_En_Abyme_Cloud_Primary_personal_Computers.pdf` to your S3/CDN media directory and supply its HTTPS directory URL as SAM parameter `MediaBaseUrl` (server environment `MEDIA_BASE_URL`). Lambda redirects the two allowlisted PDF paths there instead of buffering files larger than the response limit. Configure that media origin without cookies, analytics or tracking; no external resources are loaded on the Media page itself. Without this deployment parameter the PDF route returns a clear 503. No bucket, public access, DNS, uploads or cloud deployment are created automatically.

The build prerenders `/` and `/mea/` with unique titles, descriptions, canonical URLs, Open Graph metadata, Organization/WebSite/WebPage structured data, and MEA breadcrumbs. `public/robots.txt`, `sitemap.xml`, and `llms.txt` describe the public pages. Unknown URLs return 404. Canonicals currently use `https://www.heraldic.cloud`; update the prerender script and public discovery files together if the production hostname changes. Publishing and Search Console verification/submission remain deployment tasks, not guarantees of indexing or rankings.

Artem AI can adjust spacing, content width, typography, grid/list/two-column cards, stacked or side-by-side home hero (logo left/right), corners, alignment, text size, and logo size. Layout responses are validated patches: requesting a new font preserves a visitor's earlier spacing and card choices. Mobile layouts automatically stack content. Undo design restores the previous change during this visit; Reset design clears the saved preferences. All responses are validated on both server and client. It cannot create pages, inject CSS/HTML/JavaScript, hide navigation, or change security settings. Unreadable palettes fail validation. Prompt refusal is defense in depth; constrained rendering, not the model's obedience, is the security boundary.

Designs and edited copy are stored only in this browser's `localStorage` under `heraldic-design-v1`; Reset design removes that entry. No chat history or identifiers are persisted. Saved designs are not uploaded. Prompts and a short in-memory conversation are sent through the server to OpenAI with `store: false`; this is not a claim of zero provider retention. If browser storage is unavailable, changes are session-only. No cookies are created or read, no Set-Cookie header is emitted, and browser chat requests omit credentials. There are no analytics, tracking scripts, external fonts, or third-party embeds. Hosting/CDN settings must likewise avoid injecting cookies or analytics.

Run `npm run check` to build both pages and run the local security/SEO regression tests. The in-memory per-IP limiter is per Lambda instance; use an edge/shared limiter for stronger distributed abuse protection.
