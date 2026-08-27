set dotenv-load := true

default:
    @just --list

install:
    bun install --frozen-lockfile

test:
    bun run test -- --run

typecheck:
    bun run typecheck

biome:
    bun x @biomejs/biome ci .

build:
    bun run build

dev:
    bun run dev

deploy:
    bun run deploy

cf-typegen:
    bun run cf-typegen

migrate:
    bun run db:migrate
