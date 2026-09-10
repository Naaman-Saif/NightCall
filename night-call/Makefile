SHOP ?= /root/code/astronomy-shop
BOX ?= root@ssh-big.shipic.dev
BOX_PATH ?= /root/code/night-call
OVERRIDE = $(shell test -f $(SHOP)/compose.box-override.yaml && echo -f compose.box-override.yaml)
COMPOSE_PROD = docker compose --env-file .env --env-file .env.override -p prod -f compose.yaml -f compose.full.yaml -f compose.observability.yaml $(OVERRIDE) -f compose.nightcall.yaml

install:
	npm install

check:
	npm run lint && npm test && npm run build

smoke:
	npm run smoke:bedrock

overlay:
	npm run overlay -- $(SHOP)

prod-up:
	cd $(SHOP) && $(COMPOSE_PROD) up -d --build night-call && $(COMPOSE_PROD) up -d

prod-logs:
	cd $(SHOP) && $(COMPOSE_PROD) logs -f night-call

signature:
	npm run signature -- prod

break-payment:
	npm run deploy-bot -- $(SHOP) paymentFailure 100%

heal-payment:
	npm run deploy-bot -- $(SHOP) paymentFailure off

break-ad:
	npm run deploy-bot -- $(SHOP) adHighCpu on

heal-ad:
	npm run deploy-bot -- $(SHOP) adHighCpu off

deploy:
	git push
	ssh $(BOX) 'cd $(BOX_PATH) && git pull && cd $(SHOP) && $(COMPOSE_PROD) up -d --build night-call'

.PHONY: install check smoke overlay prod-up prod-logs signature break-payment heal-payment break-ad heal-ad deploy
