# Calendário Geral CCLX — Consulta para líderes

Página com o calendário geral da CCLX, para os líderes consultarem e proporem datas (modo edição). Cobre de setembro de 2026 a dezembro de 2027: o calendário planeia sempre o ano inteiro.

## Ficheiros

| Ficheiro | O que é |
|---|---|
| `index.html` | A página: filtros, tema claro/escuro, vista **Meses** (por semana, com feriados e datas temáticas à direita) e vista **Linha do tempo** |
| `data.json` | As datas do calendário, exportadas da página de gestão (cada evento tem um `id`) |
| `editar.js` | Modo edição: entrada por código, propostas e painel do CL (só carrega no GitHub Pages) |
| `simbolo.png`, `simbolo-branco.png` | Símbolo da CCLX (tema claro e escuro) |
| `Calendario-Geral-CCLX-2026-27.pdf` | Apresentação do calendário (27 slides): um slide por mês (16 meses), prioridades, resumo do ano e por ministério |

## Apresentação em PDF

[Descarregar a apresentação (PDF)](Calendario-Geral-CCLX-2026-27.pdf). Na página publicada há também um botão "Apresentação (PDF)" no topo.

## Atualizar as datas

As datas vêm de `data.json`. Quando o calendário mudar na página de gestão, substitui-se só este ficheiro.

## Publicar no GitHub Pages

Settings › Pages › Source: *Deploy from a branch*, branch `main`, pasta `/ (root)`.

Para usar um subdomínio (ex.: `calendario.cclx.pt`): em Settings › Pages › Custom domain escreve-se o domínio, e na Hostinger cria-se um registo DNS `CNAME` `calendario` → `cclx-pt.github.io`.

## Modo edição

1. **Acesso:** se o email não estiver registado, a página pede nome e ministério(s) e cria o pedido em `goplan_calendar_lideres` como inativo. O CL aprova pondo `ativo` = true no Supabase, ou em *CL: propostas › Líderes e pedidos › Ativar*.
2. **Entrada:** o líder carrega em *Propor datas* e escreve o email registado. Não há código nem palavra-passe; o email fica guardado nesse dispositivo até carregar em *Sair*.
3. **Propor:** com o modo edição ligado, o líder escolhe o ministério e usa *+ Propor data nesta semana*, ou *Mudar data* / *Retirar* num evento. Na linha do tempo (com um mês escolhido) toca num dia vazio da linha do ministério. Os avisos das regras aparecem enquanto escolhe a data.
4. **Decisão:** o CL aceita, recusa ou pede outra data, com nota. As aceites são depois importadas para a página de gestão e entram no `data.json`.

Dados no Supabase (organização GoPlan, projeto `dash-cal`): tabelas `goplan_calendar` (propostas) e `goplan_calendar_lideres` (quem pode propor e para que ministérios), todas com regras de acesso (RLS). A página usa só a chave pública e não lê as tabelas diretamente: tudo passa por funções no Supabase que confirmam o email registado e os ministérios (`goplan_cal_entrar`, `goplan_cal_propostas`, `goplan_cal_propor`, `goplan_cal_cancelar`, `goplan_cal_decidir`, `goplan_cal_lideres`, `goplan_cal_lider_ativo`).

## Notas

- Fora do claude.ai a página não mostra quem está online (essa função só existe dentro do Claude).
- Os filtros e o tema escolhidos ficam guardados no navegador de cada pessoa.
