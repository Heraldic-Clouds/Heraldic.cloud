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

## Daily AI Freedom Brief

The homepage shows a featured factual summary (25–45 words), a separately labeled AI-written freedom analysis (60–120 words), source links, and up to 20 additional relevant headlines. It remains usable if the brief is unavailable. A timestamp and an overdue warning after 36 hours distinguish the last good snapshot from current news. An open homepage checks for updates every five minutes while visible.

Architecture: EventBridge Scheduler → dedicated Node.js Lambda → diverse RSS/Atom feeds → inexpensive keyword ranking and event deduplication → one OpenAI Responses structured-output selection/analysis → **one** `news/current.json` object in the existing private S3 bucket → existing CloudFront → homepage. No database, dated copies, news routes, or archive are created. Do not enable S3 versioning or replication for this object if you require strictly no retained snapshot history; the template does not enable either.

The default schedule is **09:00 UTC daily**, with a 72-hour source lookback to accommodate quieter days and late feed updates. Headlines themselves can predate the generation time. The publisher caps excerpts at 600 characters and sends at most 24 candidates, not full articles. A single generation serves the brief; transient retries can mean a second API attempt. Sources include BBC, NPR, The Guardian, Al Jazeera, South China Morning Post, Ars Technica, TechCrunch, the EU Council and Commission, UK Government and US FTC. Source diversity is limited by what those feeds actually publish. Deduplication is heuristic, not a guarantee that every differently worded report of the same event will be caught.

The model instructions require evidence-based reporting, acknowledge stated regulatory rationales, distinguish conditional analysis from facts, and forbid invented motives or blame. Records are explicitly untrusted data. Strict output and runtime validation enforce lengths, safe HTTPS links, original story/source attribution and valid JSON. These safeguards do **not** independently fact-check publishers or guarantee that AI prose is accurate; consult the linked reporting before relying on it.

### Configuration and deployment

Use the same Secrets Manager secret as Artem AI. Its **SecretString must contain only the raw OpenAI API key**, not a JSON object. Keep it in the stack's deployment region and supply its ARN as `OpenAISecretArn`. The news Lambda reads the secret at invocation time, so key rotation is picked up on the next run. Existing chat still resolves the key at deployment and needs redeployment after rotation. A customer-managed KMS key would additionally require `kms:Decrypt` on that exact key; the supplied policy assumes the Secrets Manager AWS-managed key.

The template adds a dedicated news Lambda and execution role, a 14-day log group, Scheduler group/schedule and invocation role, and a five-minute CloudFront cache policy/behavior. It reuses S3, CloudFront and the OpenAI secret. The publisher role can only read that secret, write `news/current.json`, and write to its log group. Scheduler can invoke only the news Lambda, with trust restricted to this account and schedule group. Scheduler uses its execution role, so no public Lambda Function URL, API route or broad resource-based invoke permission is added.

Runtime variables (configured by CloudFormation):

| Variable | Purpose |
| --- | --- |
| `NEWS_BUCKET` | Existing private S3 bucket |
| `OPENAI_SECRET_ARN` | ARN of the existing raw-key secret; no frontend key |
| `NEWS_OPENAI_MODEL` | Structured-output model; defaults to the site's `gpt-6-luna` |
| `NEWS_LOOKBACK_HOURS` | Maximum story age; defaults to 72 |

The existing deploy wrapper builds both functions. News files are excluded from static uploads so a website deployment cannot overwrite the live brief with a local preview. Install/configure AWS CLI, AWS SAM CLI, and a compatible Node.js/Make build environment (or Docker with `-UseContainer`), then deploy:

```powershell
.\scripts\deploy.ps1 `
  -OpenAISecretArn "arn:aws:secretsmanager:us-west-2:ACCOUNT:secret:heraldic/openai-SUFFIX" `
  -StackName "heraldic-cloud" -Region "us-west-2" `
  -CloudFrontCertificateArn "arn:aws:acm:us-east-1:ACCOUNT:certificate/ID" `
  -NewsScheduleExpression 'cron(0 9 * * ? *)' `
  -NewsScheduleState ENABLED
```

AWS/OpenAI charges apply while enabled. `-NewsScheduleState DISABLED` pauses automatic generation; `-NewsOpenAIModel` and `-NewsLookbackHours` adjust generation settings. Edit `news/rss-feeds.json` to change sources, publisher-host allowlists, or explicitly allowed HTTPS redirect hosts, then redeploy. Feed failures are isolated and logged. No HTML scraping or publisher access-control bypass is attempted.

### Manual Lambda test and troubleshooting

Read the deployed function name from the stack, invoke it synchronously, then inspect its response and public snapshot:

```powershell
$newsFunction = aws cloudformation describe-stacks --stack-name heraldic-cloud --region us-west-2 --query "Stacks[0].Outputs[?OutputKey=='DailyNewsFunctionName'].OutputValue | [0]" --output text
aws lambda invoke --function-name $newsFunction --region us-west-2 --cli-read-timeout 360 --cli-binary-format raw-in-base64-out --payload '{}' news-result.json
Get-Content news-result.json
Invoke-RestMethod 'https://www.heraldic.cloud/news/current.json'
aws logs tail /heraldic/heraldic-cloud/daily-news --region us-west-2 --since 1h
```

Check for `FunctionError` even if the CLI exits successfully. Invocation requires `lambda:InvokeFunction`; reading stack outputs/logs requires the corresponding read permissions. Success returns `generated_at` and a headline count. Source/model errors are logged as sanitized codes, not secrets or prompts. Network calls use bounded timeouts/body sizes and retry transient failures. Scheduler retries delivery twice; Lambda automatic execution retries are disabled to avoid multiplying generation costs. Its reserved concurrency is one, timeout five minutes and memory 512 MB. There is no SNS alert or dead-letter archive; monitor CloudWatch Errors/logs and the homepage's freshness notice.

Only a fully validated result is written. No relevant candidates, exhausted OpenAI quota or a refused/invalid response leaves the previous object unchanged. S3 replacement is atomic; if a write times out after S3 accepts it, the object may already contain the new **valid** snapshot, so inspect it rather than assuming the previous version remains. Before the first successful run the module displays its unavailable state. An empty additional-headlines list is supported without publishing an empty featured brief.

`Cache-Control: public, max-age=60, s-maxage=300, must-revalidate` and a maximum 300-second CloudFront TTL make updates visible without daily invalidations. Missing-object errors cache for 10 seconds. The local container serves the same cache headers; S3/CloudFront provide the production snapshot.

For a **local-only** real-data preview using the previously configured `.env` key:

```powershell
npm run news:generate
docker compose up --build --detach
```

This atomically replaces the ignored `public/news/current.json`, makes a billable OpenAI request, and does not publish to AWS. Docker must rebuild to copy a newly generated local file. Do not commit the preview snapshot or credentials.

### SEO, security and verification

The homepage's title/description, Open Graph, X/Twitter and WebPage schema include the brief. Metadata is still prerendered; client navigation now shares that metadata and keeps production canonicals and route-specific images/schema instead of inheriting localhost/preview URLs or the previously visited page. A `WebPageElement` describes the module, not a fabricated Article URL. Daily stories are client-fetched: crawlers that do not run JavaScript see the module heading and description, not its latest stories. Sitemap routes are intentionally unchanged because there are no new pages; `llms.txt` points to the timestamped current snapshot.

The security review retained the restrictive document CSP, hashed JSON-LD (no unsafe-inline), HSTS, nosniff, no-referrer, denied framing/unneeded permissions, HTTPS redirect and TLS 1.2 minimum on the custom domain, private encrypted S3 and signed OAC. It added a restrictive asset/JSON CSP and an S3 insecure-transport deny; corrected invalid CloudFront allowed-method sets; and stopped local clients from spoofing the CloudFront viewer-address header to bypass the chat limiter. CloudFront requires its seven-method set for POST, but the chat handler still accepts **only POST**. `.jpeg` now has the correct MIME type. No cookies, analytics, third-party news widgets or broad CORS were added. News links are validated HTTPS URLs rendered as text with safe new-tab attributes.

`npm run check` covers feed normalization, malformed XML/DTD, filtering, event deduplication, hostile redirects, retry/body bounds, invalid/refused model responses, last-good preservation, S3 publication, and valid/missing/stale React states alongside existing security/SEO regressions. `npm audit` checks the installed dependency graph; use `sam validate --lint` for CloudFormation. These checks are not a penetration test or an OS/container-image vulnerability scan. The existing per-instance chat limiter, privacy notice, chat semantics, DNS/certificate setup and deployment account settings remain unchanged; production-wide abuse prevention would require separate edge/shared controls.
