# Calendário Geral CCLX 2026/27 — Consulta para líderes

Página só de leitura com o calendário geral da CCLX, para os líderes consultarem.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html` | A página (filtros, tema claro/escuro, lista por mês) |
| `data.json` | As datas do calendário, exportadas da página de gestão |
| `simbolo.png`, `simbolo-branco.png` | Símbolo da CCLX (tema claro e escuro) |

## Atualizar as datas

As datas vêm de `data.json`. Quando o calendário mudar na página de gestão, substitui-se só este ficheiro.

## Publicar no GitHub Pages

Settings › Pages › Source: *Deploy from a branch*, branch `main`, pasta `/ (root)`.

Para usar um subdomínio (ex.: `calendario.cclx.pt`): em Settings › Pages › Custom domain escreve-se o domínio, e na Hostinger cria-se um registo DNS `CNAME` `calendario` → `cclx-pt.github.io`.

## Notas

- Fora do claude.ai a página não mostra quem está online (essa função só existe dentro do Claude).
- Os filtros e o tema escolhidos ficam guardados no navegador de cada pessoa.
