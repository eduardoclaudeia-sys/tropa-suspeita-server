# Drama Ragdoll V0.1 — Render Fix

Versão preparada para publicação como site estático no Render.

## Arquivos
- `index.html` — jogo completo
- `README.md` — instruções

## GitHub
Suba os dois arquivos diretamente na raiz do repositório.

A estrutura deve ficar assim:

```
seu-repositorio/
├── index.html
└── README.md
```

## Render — configuração correta

Crie um **Static Site** no Render e use:

- Branch: `main`
- Build Command: deixe vazio
- Publish Directory: `.`
- Root Directory: deixe vazio

Não crie como Web Service/Node.
Não é necessário `package.json`, `npm install` ou servidor.

## Observação
O jogo carrega Matter.js diretamente pelo CDN jsDelivr, então precisa de internet para carregar a física.
