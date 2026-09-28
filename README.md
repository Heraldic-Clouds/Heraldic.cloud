# Heraldic website

A privacy-first React rebuild of the Heraldic website. It contains no trackers, ads, affiliate storefronts, or automatically loaded third-party embeds. The Kickstarter video player loads only after a visitor requests it. When a visitor submits a message to Artem AI, that message is sent to OpenAI to generate a reply.

The virtual keyboard starts closed on desktop and mobile and can be reopened with its button. Artem AI is called only through the server endpoint; the browser never receives the OpenAI key. AI edits are restricted to the site's allowlisted plain-text copy fields.

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

The included AWS SAM template packages only the built site and Lambda handler. For AWS, first store the API key in AWS Secrets Manager, then supply that secret's ARN to `OpenAISecretArn` during `sam deploy --guided`. CloudFormation resolves the secret into the Lambda environment when the function is created or updated; the key is not copied from the local `.env.local` file. API Gateway applies a shared burst/rate cap, and the Lambda handler adds a per-IP sliding-window chat limit with short message history.

```sh
npm ci
npm run build
sam build
sam deploy --guided
```

For repeatable Windows deployments, use the checked-in wrapper. It validates the SAM template, builds the function, deploys the stack, uploads static assets to the private S3 origin, and invalidates CloudFront. The deployment waits for the normal SAM change-set confirmation and never puts the OpenAI key in the template or command output:

```powershell
.\scripts\deploy.ps1 `
  -OpenAISecretArn "arn:aws:secretsmanager:REGION:ACCOUNT:secret:heraldic/openai" `
  -StackName "heraldic-cloud" `
  -Region "us-west-2"
```

To use `www.heraldic.cloud` directly on CloudFront, provide an ACM certificate ARN issued in `us-east-1`:

```powershell
 .\scripts\deploy.ps1 `
  -OpenAISecretArn "arn:aws:secretsmanager:REGION:ACCOUNT:secret:heraldic/openai" `
  -StackName "heraldic-cloud" `
  -Region "us-west-2" `
  -CloudFrontCertificateArn "arn:aws:acm:us-east-1:ACCOUNT:certificate/ID"
```

After deployment, point the `www` DNS record to the `CloudFrontDomainName` stack output. Without the certificate parameter, the stack URL is the generated CloudFront hostname and the canonical metadata remains `https://www.heraldic.cloud/`; treat that generated URL as a preview until the production DNS alias is configured.

The secret must already exist in AWS Secrets Manager, and the deploying identity needs CloudFormation, SAM artifacts, Lambda, API Gateway, CloudFront, S3, and Secrets Manager permissions. CloudFront certificates must be in `us-east-1`. Use `-UseContainer` when the local SAM build environment does not match the Lambda runtime. CloudFormation resolves the versionless secret when it creates or updates the function; rotating the secret alone does not refresh the Lambda environment, so redeploy after a key rotation.

CloudFront serves image, stylesheet, script, and icon files from a private S3 bucket through Origin Access Control. HTML and text discovery files are served by Lambda to retain per-page security headers and prerendered metadata. `/api/*` is a separate no-cache behavior; AI request bodies, responses, and cookies are not cached or forwarded as cookies. The deploy wrapper applies S3 cache metadata and invalidates the distribution after each deployment.

The Lambda handler sets a restrictive Content Security Policy, blocks framing, disables unneeded browser permissions, uses HTTPS-only transport policy, and safely normalizes request paths. Its only allowed frame origin is YouTube’s privacy-enhanced `youtube-nocookie.com` player, which loads only after a visitor chooses to play the video.

## SEO and browser-local design

### Media archive

`/media/` presents three conference posters and 17 cloud desktop, graphics benchmark, and 3D mapping images. Poster artwork opens as an image; the site does not provide a PDF service or PDF downloads. The gallery uses local assets only, with no cookies, analytics, or tracking.

The build prerenders `/`, `/heraldic/`, `/leadership/`, `/mea/`, and `/media/` with route-specific titles, descriptions, canonical URLs, Open Graph metadata, and structured data. Internal navigation swaps page content inside the monitor with the History API and supports browser back/forward; direct route visits still load their prerendered page. About opens the Heraldic company page; Leadership is visible under About in the mobile menu and available by hover or keyboard focus on desktop. Page-specific React bundles are loaded on demand, and Artem AI plus the full-size media viewer are also lazy-loaded. Media thumbnails load lazily. The Leadership route adds a Person schema profile; the Media page uses its GTC poster as the social-sharing image. `public/robots.txt`, `sitemap.xml`, `llms.txt`, and `mea.md` describe the current public pages and offerings. CloudFront serves large static assets from private S3; HTML keeps its Lambda security headers, and AI calls bypass CDN caching. Unknown URLs return 404. Canonicals currently use `https://www.heraldic.cloud`; the ACM certificate parameter enables the `www` alias, after which DNS must be pointed to the distribution. Publishing and Search Console verification/submission remain deployment tasks, not guarantees of indexing or rankings.

Artem AI can adjust spacing, content width, typography, grid/list/two-column cards, stacked or side-by-side home hero (logo left/right), corners, alignment, text size, and logo size. Layout responses are validated patches: requesting a new font preserves a visitor's earlier spacing and card choices. Mobile layouts automatically stack content. Undo design restores the previous change during this visit; Reset design clears the saved preferences. All responses are validated on both server and client. It cannot create pages, inject CSS/HTML/JavaScript, hide navigation, or change security settings. Unreadable palettes fail validation. Prompt refusal is defense in depth; constrained rendering, not the model's obedience, is the security boundary.

Designs and edited copy are stored only in this browser's `localStorage` under `heraldic-design-v1`; Reset design removes that entry. No chat history or identifiers are persisted. Saved designs are not uploaded. Prompts and a short in-memory conversation are sent through the server to OpenAI with `store: false`; this is not a claim of zero provider retention. If browser storage is unavailable, changes are session-only. No cookies are created or read, no Set-Cookie header is emitted, and browser chat requests omit credentials. There are no analytics, tracking scripts, external fonts, or third-party embeds. Hosting/CDN settings must likewise avoid injecting cookies or analytics.

Run `npm run check` to build both pages and run the local security/SEO regression tests. The in-memory per-IP limiter is per Lambda instance; use an edge/shared limiter for stronger distributed abuse protection.
