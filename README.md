# Calendário Geral CCLX — Consulta para líderes

Página só de leitura com o calendário geral da CCLX, para os líderes consultarem. Cobre de setembro de 2026 a dezembro de 2027: o calendário planeia sempre o ano inteiro.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html` | A página (filtros, tema claro/escuro, lista por mês) |
| `data.json` | As datas do calendário, exportadas da página de gestão |
| `simbolo.png`, `simbolo-branco.png` | Símbolo da CCLX (tema claro e escuro) |
| `Calendario-Geral-CCLX-2026-27.pdf` | Apresentação do calendário (27 slides): um slide por mês (16 meses), prioridades, resumo do ano e por ministério |

## Apresentação em PDF

[Descarregar a apresentação (PDF)](Calendario-Geral-CCLX-2026-27.pdf). Na página publicada há também um botão "Apresentação (PDF)" no topo.

## Atualizar as datas

As datas vêm de `data.json`. Quando o calendário mudar na página de gestão, substitui-se só este ficheiro.

## Publicar no GitHub Pages

Settings › Pages › Source: *Deploy from a branch*, branch `main`, pasta `/ (root)`.

Para usar um subdomínio (ex.: `calendario.cclx.pt`): em Settings › Pages › Custom domain escreve-se o domínio, e na Hostinger cria-se um registo DNS `CNAME` `calendario` → `cclx-pt.github.io`.

## Notas

- Fora do claude.ai a página não mostra quem está online (essa função só existe dentro do Claude).
- Os filtros e o tema escolhidos ficam guardados no navegador de cada pessoa.
