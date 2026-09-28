# Heraldic website

A privacy-first React rebuild of the Heraldic website. It contains no trackers, ads, affiliate storefronts, or automatically loaded third-party embeds. The Kickstarter video player loads only after a visitor requests it. When a visitor submits a message to Artem AI, that message is sent to OpenAI to generate a reply.

The keyboard is an always-visible prompt surface beneath the fixed monitor. Its keys type into the prompt. Artem AI is called only through the server endpoint; the browser never receives the OpenAI key. AI edits are restricted to the site's allowlisted plain-text copy fields.

## Local development

```sh
npm install
npm run dev
```

For Docker, put `OPENAI_API_KEY=...` in the workspace `.env` file. Compose injects it into the server container at runtime; `.env` is excluded from the image build context.

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

For repeatable Windows deployments, use the checked-in wrapper. It validates the SAM template, builds the function, resolves an artifacts bucket, and deploys without putting the OpenAI key in the template or command output:

```powershell
.\scripts\deploy.ps1 `
  -OpenAISecretArn "arn:aws:secretsmanager:REGION:ACCOUNT:secret:heraldic/openai" `
  -StackName "heraldic-cloud" `
  -Region "us-west-2"
```

The secret must already exist in AWS Secrets Manager, and the deploying identity needs CloudFormation, SAM artifacts, Lambda, API Gateway, and Secrets Manager permissions. Use `-UseContainer` when the local SAM build environment does not match the Lambda runtime.

The Lambda handler sets a restrictive Content Security Policy, blocks framing, disables unneeded browser permissions, uses HTTPS-only transport policy, and safely normalizes request paths. Its only allowed frame origin is YouTube’s privacy-enhanced `youtube-nocookie.com` player, which loads only after a visitor chooses to play the video.

## SEO and browser-local design

### Media archive

`/media/` presents three conference posters and 18 archival cloud desktop, graphics benchmark, and 3D mapping images. Poster artwork opens as an image; the site does not provide a PDF service or PDF downloads. The gallery uses local assets only, with no cookies, analytics, or tracking.

The build prerenders `/`, `/heraldic/`, `/leadership/`, `/mea/`, and `/media/` with route-specific titles, descriptions, canonical URLs, Open Graph metadata, and structured data. Internal navigation swaps page content inside the monitor with the History API and supports browser back/forward; direct route visits still load their prerendered page. About in the navigation opens the Heraldic company page; hovering or keyboard-focusing it reveals the Leadership page. Page-specific React bundles are loaded on demand, and Artem AI plus the full-size media viewer are also lazy-loaded. Media thumbnails load lazily. The Leadership route adds a Person schema profile; the Media page uses its GTC poster as the social-sharing image. `public/robots.txt`, `sitemap.xml`, and `llms.txt` describe the public pages. The Lambda catch-all serves the new static routes without additional CloudFormation resources. Unknown URLs return 404. Canonicals currently use `https://www.heraldic.cloud`; update the prerender script and public discovery files together if the production hostname changes. Publishing and Search Console verification/submission remain deployment tasks, not guarantees of indexing or rankings.

Artem AI can adjust spacing, content width, typography, grid/list/two-column cards, stacked or side-by-side home hero (logo left/right), corners, alignment, text size, and logo size. Layout responses are validated patches: requesting a new font preserves a visitor's earlier spacing and card choices. Mobile layouts automatically stack content. Undo design restores the previous change during this visit; Reset design clears the saved preferences. All responses are validated on both server and client. It cannot create pages, inject CSS/HTML/JavaScript, hide navigation, or change security settings. Unreadable palettes fail validation. Prompt refusal is defense in depth; constrained rendering, not the model's obedience, is the security boundary.

Designs and edited copy are stored only in this browser's `localStorage` under `heraldic-design-v1`; Reset design removes that entry. No chat history or identifiers are persisted. Saved designs are not uploaded. Prompts and a short in-memory conversation are sent through the server to OpenAI with `store: false`; this is not a claim of zero provider retention. If browser storage is unavailable, changes are session-only. No cookies are created or read, no Set-Cookie header is emitted, and browser chat requests omit credentials. There are no analytics, tracking scripts, external fonts, or third-party embeds. Hosting/CDN settings must likewise avoid injecting cookies or analytics.

Run `npm run check` to build both pages and run the local security/SEO regression tests. The in-memory per-IP limiter is per Lambda instance; use an edge/shared limiter for stronger distributed abuse protection.
