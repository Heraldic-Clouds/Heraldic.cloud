build-HeraldicSiteFunction:
	npm ci
	npm run build
	mkdir -p "$(ARTIFACTS_DIR)/dist"
	cp dist/index.html "$(ARTIFACTS_DIR)/dist/index.html"
	for page in heraldic leadership mea media; do mkdir -p "$(ARTIFACTS_DIR)/dist/$$page"; cp "dist/$$page/index.html" "$(ARTIFACTS_DIR)/dist/$$page/index.html"; done
	cp dist/robots.txt dist/sitemap.xml dist/llms.txt dist/mea.md "$(ARTIFACTS_DIR)/dist/"
	cp lambda/index.mjs "$(ARTIFACTS_DIR)/index.mjs"
	cp lambda/design.mjs "$(ARTIFACTS_DIR)/design.mjs"
	cp lambda/prompt.mjs "$(ARTIFACTS_DIR)/prompt.mjs"
	cp src/site-copy.json "$(ARTIFACTS_DIR)/site-copy.json"
	mkdir -p "$(ARTIFACTS_DIR)/shared"
	cp shared/news-snapshot.mjs "$(ARTIFACTS_DIR)/shared/news-snapshot.mjs"

build-DailyNewsFunction:
	mkdir -p "$(ARTIFACTS_DIR)/news" "$(ARTIFACTS_DIR)/shared"
	cp news/*.mjs news/rss-feeds.json "$(ARTIFACTS_DIR)/news/"
	cp shared/news-snapshot.mjs "$(ARTIFACTS_DIR)/shared/news-snapshot.mjs"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/"
	cd "$(ARTIFACTS_DIR)" && npm ci --omit=dev --ignore-scripts
