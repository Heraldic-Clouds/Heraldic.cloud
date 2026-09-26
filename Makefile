build-HeraldicSiteFunction:
	npm ci
	npm run build
	mkdir -p "$(ARTIFACTS_DIR)/dist"
	cp -R dist/. "$(ARTIFACTS_DIR)/dist"
	cp lambda/index.mjs "$(ARTIFACTS_DIR)/index.mjs"
	cp lambda/design.mjs "$(ARTIFACTS_DIR)/design.mjs"
	cp src/site-copy.json "$(ARTIFACTS_DIR)/site-copy.json"
