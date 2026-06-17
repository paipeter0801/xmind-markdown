# Makefile — XMind to Markdown（靜態 Astro PWA）
# 改寫自 ENGINEERING_GUIDE §3.2（Cloudflare/Astro 棧），移除 drizzle/db-migrate。
# CI 呼叫 `make install` 後 `make ci`。

.PHONY: install dev lint typecheck test build ci deploy clean

install:
	npm install

dev:
	npm run dev

lint:
	npm run lint

typecheck:
	npm run typecheck

test:
	npm run test:run

build:
	npm run build

ci: lint typecheck test build
	@echo "CI checks passed."

deploy:
	npm run deploy

clean:
	rm -rf node_modules
	rm -rf .astro dist coverage .vitest-cache
