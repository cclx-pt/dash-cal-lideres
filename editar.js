/* Modo edição do Calendário Geral CCLX (só no GitHub Pages).
   Líderes pedem acesso, o CL aprova, e depois entram com o código ou o link que chega por email.
   Propostas ficam no Supabase (projeto dash-cal, tabela goplan_calendar). Só a chave pública. */
(() => {
  const SB_URL = "https://qtboyrccpubxwjaudued.supabase.co";
  const SB_KEY = "sb_publishable_nGXTkIM8UREZnk-h7PZYPA_79hsPIjA";
  const C = window.CCLX; if (!C) return;
  const { el, P, iso, MC, DS, MES, MCOL, today, $ } = C;
  const sb = window.supabase && window.supabase.createClient ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } }) : null;
  const st = { get(k, d) { try { const v = localStorage.getItem("cclx-ed-" + k); return v === null ? d : v; } catch (e) { return d; } },
               set(k, v) { try { localStorage.setItem("cclx-ed-" + k, v); } catch (e) {} } };
  const ED = window.ED = { on: false, me: null, lider: null, min: "", mine: [], open: null };
  const fmt = s => { if (!s) return ""; const d = P(s); return `${DS[d.getDay()]} ${d.getDate()}/${MC[d.getMonth()]}/${d.getFullYear()}`; };
  const fmtR = (a, b) => b && b !== a ? `${fmt(a)} a ${fmt(b)}` : fmt(a);
  const MAXD = "2027-12-31", MIND = "2026-09-01";
  const allMins = () => [...new Set(C.DATA().datas.filter(r => r.k === "geral").map(r => r.m))].sort((a, b) => a.localeCompare(b, "pt"));
  const isCL = () => ED.lider && ED.lider.papel === "cl";
  const myMins = () => !ED.lider ? [] : isCL() ? allMins() : ED.lider.ministerios.filter(m => allMins().includes(m) || true);
  const canEdit = r => ED.on && ED.lider && r && r.k === "geral" && !r.cel && r.id && (ED.min ? r.m === ED.min : myMins().includes(r.m));
  const COMS = ["Sede", "Porto", "Almada", "Moita", "Coruche", "Caldas da Rainha", "Açores"];

  /* ---------- avisos das regras (principais) ---------- */
  function avisos(i, f, excl) {
    const out = []; if (!i) return out;
    f = f && f >= i ? f : i;
    const D = C.DATA().datas;
    if (i < today) out.push(["erro", "A data já passou."]);
    if (i < MIND || f > MAXD) out.push(["erro", "Fora do período do calendário (set. 2026 a dez. 2027)."]);
    const days = []; for (let d = P(i); iso(d) <= f && days.length < 40; d.setDate(d.getDate() + 1)) days.push(iso(d));
    for (const r of D) {
      if (r.id === excl) continue;
      const a = r.i, b = r.f || r.i, over = a <= f && b >= i;
      if (!over) continue;
      if (r.k === "feriado") out.push(["aviso", `Feriado: ${r.t} (${r.tf === "Nacional" ? "nacional" : r.tf}).`]);
      else if (r.k === "ferias") out.push(["info", `Fica na ${r.t.toLowerCase()}.`]);
      else if (r.k === "gc" && r.g === "evento") out.push(["info", `Semana de evento nos GCs (${r.t}).`]);
    }
    for (const s of days) {
      const d = P(s);
      if (d.getDay() === 0 && d.getDate() <= 7) out.push(["aviso", `${fmt(s)} é o 1.º domingo do mês (Culto de Ceia).`]);
    }
    const short = r => Math.round((P(r.f || r.i) - P(r.i)) / 864e5) <= 3;
    const same = D.filter(r => r.k === "geral" && !r.cel && r.id !== excl && r.i <= f && (r.f || r.i) >= i && r.v !== "interno" && short(r) && !/^Culto de Ceia/.test(r.t));
    if (same.length) out.push(["aviso", `No mesmo período: ${same.slice(0, 4).map(r => `${r.t} (${r.m}, ${fmt(r.i)})`).join("; ")}${same.length > 4 ? ` e mais ${same.length - 4}` : ""}.`]);
    for (const r of D.filter(r => r.k === "geral" && /Sessão de Integração/.test(r.t))) {
      const s = P(r.i), mon = new Date(s); mon.setDate(s.getDate() - ((s.getDay() + 6) % 7)); const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
      const a = iso(mon), b = iso(fri);
      if (days.some(x => x >= a && x <= b)) out.push(["aviso", `Semana da Sessão de Integração (${fmt(r.i)}): sem outras atividades públicas de segunda a sexta (regra 12).`]);
    }
    return out;
  }
  function avBox(list) {
    const b = el("div", { class: "ed-av", "aria-live": "polite" });
    if (!list.length) { b.append(el("div", { class: "ed-av-ok", text: "Sem avisos das regras para esta data." })); return b; }
    for (const [t, m] of list) b.append(el("div", { class: "ed-av-" + t, text: m }));
    return b;
  }

  /* ---------- formulários inline ---------- */
  function field(label, input, hint) { return el("label", { class: "ed-f" }, el("span", { text: label }), input, hint ? el("small", { text: hint }) : null); }
  function closeOpen() { if (ED.open) { ED.open.remove(); ED.open = null; } }
  function form(kind, ctx) {
    closeOpen();
    const box = el("form", { class: "ed-form", novalidate: "" });
    const r = ctx.r;
    const head = kind === "nova" ? "Propor nova data" : kind === "mudar" ? "Propor mudança de data" : "Propor retirar do calendário";
    box.append(el("div", { class: "ed-fh" }, el("b", { text: head }), r ? el("span", { text: ` · ${r.t} · ${fmtR(r.i, r.f)}` }) : null));
    const inp = (type, attrs) => el("input", Object.assign({ type }, attrs || {}));
    let tTitulo, tIni, tFim, tHora, tAmb, tCom, tVis, tMin, tMot;
    const grid = el("div", { class: "ed-grid" });
    if (kind === "nova") {
      if (!ED.min) { tMin = el("select", {}); for (const m of myMins()) tMin.append(el("option", { value: m, text: m })); grid.append(field("Ministério", tMin)); }
      tTitulo = inp("text", { maxlength: "120", required: "", placeholder: "Ex.: Encontro de líderes" }); grid.append(field("Título", tTitulo));
    }
    if (kind !== "retirar") {
      tIni = inp("date", { min: MIND, max: MAXD, required: "", value: kind === "nova" ? ctx.dia || ctx.wIso : r.i });
      tFim = inp("date", { min: MIND, max: MAXD, value: kind === "mudar" && r.f ? r.f : "" });
      tHora = inp("text", { maxlength: "40", placeholder: "Ex.: 10h00", value: kind === "mudar" ? r.h || "" : "" });
      grid.append(field(kind === "nova" ? "Data" : "Nova data", tIni, kind === "nova" && ctx.wIso ? `Semana de ${P(ctx.wIso).getDate()} a ${P(ctx.eIso).getDate()}/${MC[P(ctx.eIso).getMonth()]} (pode escolher outro dia)` : ""), field("Até (opcional)", tFim), field("Hora (opcional)", tHora));
      if (kind === "mudar" && r.f && r.f !== r.i) {
        const dur = Math.round((P(r.f) - P(r.i)) / 864e5);
        tIni.addEventListener("change", () => { if (tIni.value) { const d = P(tIni.value); d.setDate(d.getDate() + dur); tFim.value = iso(d); upd(); } });
      }
    }
    if (kind === "nova") {
      tAmb = el("select", {}); [["Igreja", "Toda a igreja"], ["Regional", "Regional"], ["Comunidade", "Local de uma comunidade"]].forEach(([v, t]) => tAmb.append(el("option", { value: v, text: t })));
      tCom = el("select", {}); COMS.forEach(c => tCom.append(el("option", { value: c, text: c })));
      const fc = field("Comunidade", tCom); fc.hidden = true;
      tAmb.addEventListener("change", () => { fc.hidden = tAmb.value !== "Comunidade"; });
      tVis = el("select", {}); [["publico", "Pública"], ["interno", "Interna (só equipa)"]].forEach(([v, t]) => tVis.append(el("option", { value: v, text: t })));
      grid.append(field("Âmbito", tAmb), fc, field("Visibilidade", tVis));
    }
    box.append(grid);
    tMot = el("textarea", { rows: "2", maxlength: "600", placeholder: kind === "nova" ? "Para quem é, o que é, notas para o CL" : "Porque propõe esta alteração" });
    box.append(field(kind === "nova" ? "Descrição e notas" : "Motivo", tMot));
    let av = avBox([]); box.append(av);
    const upd = () => { if (kind === "retirar") { av.replaceWith(av = el("div")); return; } const n = avBox(avisos(tIni.value, tFim.value, r && r.id)); av.replaceWith(n); av = n; };
    if (tIni) { tIni.addEventListener("input", upd); tFim.addEventListener("input", upd); }
    upd();
    const msg = el("div", { class: "ed-msg", role: "status" });
    const send = el("button", { type: "submit", class: "ed-btn pri", text: "Enviar proposta" });
    const cancel = el("button", { type: "button", class: "ed-btn", text: "Cancelar" });
    cancel.addEventListener("click", closeOpen);
    box.append(el("div", { class: "ed-act" }, send, cancel, msg));
    box.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const row = { tipo: kind, motivo: tMot.value.trim(), nome: ED.lider.nome || "" };
      if (kind === "nova") {
        row.ministerio = tMin ? tMin.value : ED.min; row.titulo = tTitulo.value.trim();
        if (!row.titulo) { msg.textContent = "Escreva o título."; tTitulo.focus(); return; }
        row.ambito = tAmb.value; row.comunidade = tAmb.value === "Comunidade" ? tCom.value : null; row.visibilidade = tVis.value;
      } else {
        Object.assign(row, { ministerio: r.m, evento_id: r.id, evento_titulo: r.t, data_atual: r.i, data_atual_fim: r.f || null, titulo: r.t });
        if (!row.motivo) { msg.textContent = "Escreva o motivo."; tMot.focus(); return; }
      }
      if (tIni) {
        if (!tIni.value) { msg.textContent = "Escolha a data."; tIni.focus(); return; }
        if (tFim.value && tFim.value < tIni.value) { msg.textContent = "A data final é antes da inicial."; tFim.focus(); return; }
        if (kind === "mudar" && tIni.value === r.i && (tFim.value || "") === (r.f || "")) { msg.textContent = "A nova data é igual à atual."; return; }
        row.data_inicio = tIni.value; row.data_fim = tFim.value || null; row.hora = tHora.value.trim() || null;
        row.avisos = avisos(tIni.value, tFim.value, r && r.id).map(x => x[1]);
      }
      send.disabled = true; send.textContent = "A enviar…";
      const { error } = await sb.from("goplan_calendar").insert(row);
      send.disabled = false; send.textContent = "Enviar proposta";
      if (error) { msg.textContent = /row-level/.test(error.message) ? "Não tem permissão para propor neste ministério." : "Não foi possível enviar. Tente de novo."; return; }
      closeOpen(); await loadMine(); C.render();
      toast("Proposta enviada ao CL. Pode acompanhar em «As minhas propostas».");
    });
    ED.open = box;
    return box;
  }

  /* ---------- ganchos chamados pela página ---------- */
  ED.item = (li, r) => {
    const pend = ED.mine.filter(p => p.evento_id === r.id && p.estado === "pendente");
    const tx = li.querySelector(".tx");
    for (const p of pend) tx.append(el("div", { class: "ed-sent-note", text: p.tipo === "retirar" ? "Proposta enviada: retirar do calendário" : `Proposta enviada: mudar para ${fmtR(p.data_inicio, p.data_fim)}` }));
    if (!canEdit(r)) return;
    const a = el("div", { class: "ed-row" });
    const b1 = el("button", { type: "button", class: "ed-link", text: "Mudar data" });
    const b2 = el("button", { type: "button", class: "ed-link", text: "Retirar" });
    b1.addEventListener("click", () => { const f = form("mudar", { r }); li.after(el("li", { class: "ed-li" }, f)); ED.open = f.parentNode; f.querySelector("input,textarea")?.focus(); });
    b2.addEventListener("click", () => { const f = form("retirar", { r }); li.after(el("li", { class: "ed-li" }, f)); ED.open = f.parentNode; f.querySelector("textarea")?.focus(); });
    a.append(b1, b2); tx.append(a);
  };
  ED.week = (col, ctx) => {
    const sent = ED.mine.filter(p => p.tipo === "nova" && p.estado === "pendente" && p.data_inicio >= ctx.wIso && p.data_inicio <= ctx.eIso);
    if (sent.length) {
      const ul = el("ul", { class: "lst ed-sent" });
      for (const p of sent) {
        const d = P(p.data_inicio);
        ul.append(el("li", { class: "it" }, el("div", { class: "dt" }, `${d.getDate()}/${MC[d.getMonth()]}`, el("span", { text: DS[d.getDay()] })),
          el("div", { class: "tx" }, el("div", { class: "ti", text: p.titulo }), el("div", { class: "tags" }, el("span", { class: "tag min", text: p.ministerio, style: `--mc:${MCOL[p.ministerio] || "#8a8a86"}` }), el("span", { class: "tag sent", text: "Proposta enviada" })))));
      }
      col.prepend(ul);
    }
    if (!ED.lider || !myMins().length) return;
    const b = el("button", { type: "button", class: "ed-add", text: "+ Propor data nesta semana" });
    b.addEventListener("click", () => { const f = form("nova", ctx); b.after(f); f.querySelector("select,input")?.focus(); });
    col.append(b);
  };
  ED.det = (det, r) => {
    if (!canEdit(r)) return;
    const a = el("div", { class: "ed-row" });
    const b1 = el("button", { type: "button", class: "ed-link", text: "Mudar data" });
    const b2 = el("button", { type: "button", class: "ed-link", text: "Retirar" });
    b1.addEventListener("click", () => { det.append(form("mudar", { r })); });
    b2.addEventListener("click", () => { det.append(form("retirar", { r })); });
    a.append(b1, b2); det.append(a);
  };
  ED.lanes = () => !ED.lider ? [] : ED.min ? [ED.min] : isCL() ? [] : myMins();
  ED.tlNew = (det, dia, m) => {
    if (!ED.on || !ED.lider || !(ED.min ? m === ED.min : myMins().includes(m))) return false;
    const prev = ED.min; if (!ED.min) ED.min = m;
    det.replaceChildren(el("div", {}, el("b", { text: `Novo evento · ${m}` }), " · " + fmt(dia)), form("nova", { dia }));
    ED.min = prev;
    return true;
  };

  /* ---------- toast ---------- */
  function toast(t) { const n = el("div", { class: "ed-toast", role: "status", text: t }); document.body.append(n); setTimeout(() => n.remove(), 4200); }

  /* ---------- painéis (dialog) ---------- */
  const dlg = el("dialog", { class: "ed-dlg", "aria-labelledby": "edDlgT" });
  document.body.append(dlg);
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  function panel(title, ...kids) {
    const x = el("button", { type: "button", class: "iconbtn ed-x", "aria-label": "Fechar", text: "×" }); x.addEventListener("click", () => dlg.close());
    dlg.replaceChildren(el("div", { class: "ed-dh" }, el("h3", { id: "edDlgT", text: title }), x), ...kids);
    if (!dlg.open) dlg.showModal();
  }

  /* login: 1.º passo email; se não estiver registado, pedido de acesso */
  function loginPanel(pref) {
    const em = el("input", { type: "email", autocomplete: "email", required: "", placeholder: "nome@exemplo.pt", value: pref || st.get("email", "") });
    const msg = el("div", { class: "ed-msg", role: "status" });
    const go = el("button", { type: "submit", class: "ed-btn pri", text: "Enviar código" });
    const f = el("form", { class: "ed-pf" }, el("p", { text: "Para propor datas, entre com o seu email. Enviamos um código e um link de entrada para esse email." }), field("Email", em), el("div", { class: "ed-act" }, go, msg));
    const req = el("button", { type: "button", class: "ed-link", text: "É a primeira vez? Pedir acesso" });
    req.addEventListener("click", () => requestPanel(em.value));
    f.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const email = em.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escreva um email válido."; return; }
      go.disabled = true; go.textContent = "A verificar…";
      const { data: ok, error: e1 } = await sb.rpc("goplan_cal_registado", { p_email: email });
      if (e1) { go.disabled = false; go.textContent = "Enviar código"; msg.textContent = "Não foi possível ligar. Tente de novo."; return; }
      if (!ok) { go.disabled = false; go.textContent = "Enviar código"; requestPanel(email, "Este email ainda não tem acesso. Peça acesso ao CL:"); return; }
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
      go.disabled = false; go.textContent = "Enviar código";
      if (error) { msg.textContent = /rate|seconds/i.test(error.message) ? "Pediu um código há pouco. Aguarde um minuto e tente de novo." : "Não foi possível enviar o código. Tente de novo."; return; }
      st.set("email", email); codePanel(email);
    });
    panel("Entrar no modo edição", f, el("div", { class: "ed-foot" }, req));
    em.focus();
  }
  function codePanel(email) {
    const code = el("input", { type: "text", inputmode: "numeric", autocomplete: "one-time-code", maxlength: "10", required: "", placeholder: "Código do email", class: "ed-code" });
    const msg = el("div", { class: "ed-msg", role: "status" });
    const go = el("button", { type: "submit", class: "ed-btn pri", text: "Entrar" });
    const f = el("form", { class: "ed-pf" }, el("p", {}, "Enviámos um código para ", el("b", { text: email }), ". Escreva-o aqui, ou abra o link do email neste dispositivo."), field("Código", code), el("div", { class: "ed-act" }, go, msg));
    const back = el("button", { type: "button", class: "ed-link", text: "Usar outro email" }); back.addEventListener("click", () => loginPanel(email));
    f.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      go.disabled = true; go.textContent = "A entrar…";
      const { error } = await sb.auth.verifyOtp({ email, token: code.value.trim(), type: "email" });
      go.disabled = false; go.textContent = "Entrar";
      if (error) { msg.textContent = "Código inválido ou expirado. Confirme ou peça um novo."; return; }
      dlg.close();
    });
    panel("Código de entrada", f, el("div", { class: "ed-foot" }, back));
    code.focus();
  }
  function requestPanel(pref, lead) {
    const nm = el("input", { type: "text", autocomplete: "name", required: "", maxlength: "120" });
    const em = el("input", { type: "email", autocomplete: "email", required: "", value: pref || "" });
    const mins = el("div", { class: "ed-mins" });
    for (const m of allMins()) mins.append(el("label", {}, el("input", { type: "checkbox", value: m }), " " + m));
    const tx = el("textarea", { rows: "2", maxlength: "500", placeholder: "Opcional: que funções tem no ministério" });
    const msg = el("div", { class: "ed-msg", role: "status" });
    const go = el("button", { type: "submit", class: "ed-btn pri", text: "Pedir acesso" });
    const f = el("form", { class: "ed-pf" }, el("p", { text: lead || "Primeira vez? Indique o nome, o email e o ministério que lidera. O CL aprova o pedido e depois recebe por email o código e o link para entrar." }),
      field("Nome", nm), field("Email", em), el("fieldset", { class: "ed-fs" }, el("legend", { text: "Ministério(s) que lidera" }), mins), field("Mensagem para o CL", tx), el("div", { class: "ed-act" }, go, msg));
    f.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const email = em.value.trim().toLowerCase(), nome = nm.value.trim(), ms = [...mins.querySelectorAll("input:checked")].map(x => x.value);
      if (nome.length < 2) { msg.textContent = "Escreva o nome."; nm.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escreva um email válido."; em.focus(); return; }
      if (!ms.length) { msg.textContent = "Escolha pelo menos um ministério."; return; }
      go.disabled = true; go.textContent = "A enviar…";
      const { error } = await sb.from("goplan_calendar_pedidos").insert({ nome, email, ministerios: ms, mensagem: tx.value.trim() });
      if (!error) { try { await sb.functions.invoke("goplan-cal-notificar", { body: { email } }); } catch (e2) {} }
      go.disabled = false; go.textContent = "Pedir acesso";
      if (error) { msg.textContent = /duplicate|unique/i.test(error.message) ? "Já existe um pedido pendente para este email. Aguarde a aprovação do CL." : "Não foi possível enviar o pedido. Tente de novo."; return; }
      st.set("email", email);
      panel("Pedido enviado", el("p", {}, "Obrigado, ", el("b", { text: nome }), ". O pedido foi enviado ao CL. Quando for aprovado, recebe em ", el("b", { text: email }), " um código e um link para entrar."));
    });
    panel("Pedir acesso ao modo edição", f);
    (pref ? nm : em).focus();
  }

  /* as minhas propostas */
  const EST = { pendente: "Pendente", aceite: "Aceite", recusada: "Recusada", outra_data: "Pedida outra data", cancelada: "Cancelada" };
  const TIPO = { nova: "Nova data", mudar: "Mudar data", retirar: "Retirar" };
  function propCard(p, actions) {
    const what = p.tipo === "nova" ? `${p.titulo} · ${fmtR(p.data_inicio, p.data_fim)}` : p.tipo === "mudar" ? `${p.evento_titulo} · de ${fmtR(p.data_atual, p.data_atual_fim)} para ${fmtR(p.data_inicio, p.data_fim)}` : `${p.evento_titulo} · ${fmtR(p.data_atual, p.data_atual_fim)}`;
    const c = el("div", { class: "ed-card" },
      el("div", { class: "ed-ch" }, el("span", { class: "tag min", text: p.ministerio, style: `--mc:${MCOL[p.ministerio] || "#8a8a86"}` }), el("span", { class: "tag", text: TIPO[p.tipo] }), el("span", { class: "tag est-" + p.estado, text: EST[p.estado] })),
      el("div", { class: "ed-cw", text: what }),
      p.hora ? el("div", { class: "ed-cs", text: "Hora: " + p.hora }) : null,
      p.motivo ? el("div", { class: "ed-cs", text: (p.tipo === "nova" ? "Notas: " : "Motivo: ") + p.motivo }) : null,
      (p.avisos || []).length ? el("div", { class: "ed-cs ed-cav", text: "Avisos: " + p.avisos.join(" ") }) : null,
      el("div", { class: "ed-cs", text: `${p.nome || p.email} · ${new Date(p.criado_em).toLocaleDateString("pt-PT")}` }),
      p.nota_cl ? el("div", { class: "ed-cs ed-cnota", text: "Nota do CL: " + p.nota_cl }) : null);
    if (actions) c.append(actions);
    return c;
  }
  async function minePanel() {
    await loadMine();
    const list = el("div", { class: "ed-list" });
    if (!ED.mine.length) list.append(el("p", { class: "ed-empty", text: "Ainda não enviou propostas." }));
    for (const p of ED.mine) {
      let act = null;
      if (p.estado === "pendente") {
        const b = el("button", { type: "button", class: "ed-link", text: "Cancelar proposta" });
        b.addEventListener("click", async () => { b.disabled = true; const { error } = await sb.from("goplan_calendar").update({ estado: "cancelada" }).eq("id", p.id); if (error) { b.disabled = false; toast("Não foi possível cancelar."); return; } await loadMine(); C.render(); minePanel(); });
        act = el("div", { class: "ed-row" }, b);
      }
      list.append(propCard(p, act));
    }
    panel("As minhas propostas", list);
  }

  /* CL: propostas e pedidos de acesso */
  async function clPanel(tab) {
    tab = tab || "prop";
    const tabs = el("div", { class: "vseg ed-tabs" });
    for (const [k, t] of [["prop", "Propostas"], ["ped", "Pedidos de acesso"], ["lid", "Líderes"]]) {
      const b = el("button", { type: "button", "aria-pressed": String(k === tab), text: t }); b.addEventListener("click", () => clPanel(k)); tabs.append(b);
    }
    const body = el("div", { class: "ed-list" }, el("p", { class: "ed-empty", text: "A carregar…" }));
    panel("Conselho de Liderança", tabs, body);
    if (tab === "prop") {
      const flt = st.get("clEst", "pendente");
      const { data, error } = await sb.from("goplan_calendar").select("*").order("criado_em", { ascending: false }).limit(300);
      body.replaceChildren();
      if (error) { body.append(el("p", { class: "ed-empty", text: "Não foi possível carregar." })); return; }
      const sel = el("select", { "aria-label": "Estado" }); for (const [v, t] of [["pendente", "Pendentes"], ["aceite", "Aceites (por importar)"], ["", "Todas"]]) sel.append(el("option", { value: v, text: t }));
      sel.value = flt; sel.addEventListener("change", () => { st.set("clEst", sel.value); clPanel("prop"); });
      body.append(el("div", { class: "ed-row" }, sel, el("span", { class: "ed-cs", text: "As aceites entram no calendário quando forem importadas para a página de gestão." })));
      const rows = data.filter(p => !flt ? true : flt === "aceite" ? p.estado === "aceite" && !p.importado_em : p.estado === flt);
      if (!rows.length) body.append(el("p", { class: "ed-empty", text: "Nada por aqui." }));
      for (const p of rows) {
        let act = null;
        if (p.estado === "pendente") {
          const nota = el("input", { type: "text", maxlength: "300", placeholder: "Nota para o líder (obrigatória ao recusar ou pedir outra data)" });
          const mk = (t, est, cls) => { const b = el("button", { type: "button", class: "ed-btn " + (cls || ""), text: t }); b.addEventListener("click", async () => {
            if (est !== "aceite" && !nota.value.trim()) { nota.focus(); nota.placeholder = "Escreva a nota para o líder"; return; }
            b.disabled = true; const { error: e2 } = await sb.from("goplan_calendar").update({ estado: est, nota_cl: nota.value.trim() || null }).eq("id", p.id);
            if (e2) { b.disabled = false; toast("Não foi possível guardar."); return; } toast(EST[est] + "."); clPanel("prop"); }); return b; };
          act = el("div", { class: "ed-dec" }, nota, el("div", { class: "ed-row" }, mk("Aceitar", "aceite", "pri"), mk("Pedir outra data", "outra_data"), mk("Recusar", "recusada")));
        }
        body.append(propCard(p, act));
      }
    } else if (tab === "ped") {
      const { data, error } = await sb.from("goplan_calendar_pedidos").select("*").eq("estado", "pendente").order("criado_em");
      body.replaceChildren();
      if (error) { body.append(el("p", { class: "ed-empty", text: "Não foi possível carregar." })); return; }
      if (!data.length) body.append(el("p", { class: "ed-empty", text: "Não há pedidos de acesso pendentes." }));
      for (const q of data) {
        const mins = el("div", { class: "ed-mins" });
        for (const m of allMins()) mins.append(el("label", {}, el("input", { type: "checkbox", value: m, ...(q.ministerios.includes(m) ? { checked: "" } : {}) }), " " + m));
        const pap = el("select", {}); pap.append(el("option", { value: "lider", text: "Líder (propõe para os ministérios escolhidos)" }), el("option", { value: "cl", text: "CL (decide propostas)" }));
        const ok = el("button", { type: "button", class: "ed-btn pri", text: "Aprovar e enviar código" });
        const no = el("button", { type: "button", class: "ed-btn", text: "Recusar" });
        ok.addEventListener("click", async () => {
          const ms = [...mins.querySelectorAll("input:checked")].map(x => x.value);
          if (!ms.length && pap.value === "lider") { toast("Escolha pelo menos um ministério."); return; }
          ok.disabled = true;
          const { error: e2 } = await sb.rpc("goplan_cal_aprovar", { p_id: q.id, p_ministerios: ms, p_papel: pap.value });
          if (e2) { ok.disabled = false; toast("Não foi possível aprovar."); return; }
          const { error: e3 } = await sb.auth.signInWithOtp({ email: q.email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } });
          toast(e3 ? "Aprovado. O email com o código não saiu; o líder pode pedir o código na página." : `Aprovado. Enviámos o código e o link para ${q.email}.`);
          clPanel("ped");
        });
        no.addEventListener("click", async () => { no.disabled = true; const { error: e2 } = await sb.from("goplan_calendar_pedidos").update({ estado: "recusado" }).eq("id", q.id); if (e2) { no.disabled = false; toast("Não foi possível guardar."); return; } clPanel("ped"); });
        body.append(el("div", { class: "ed-card" }, el("div", { class: "ed-cw" }, el("b", { text: q.nome }), " · " + q.email), q.mensagem ? el("div", { class: "ed-cs", text: q.mensagem }) : null,
          el("div", { class: "ed-cs", text: "Pedido a " + new Date(q.criado_em).toLocaleDateString("pt-PT") }), el("fieldset", { class: "ed-fs" }, el("legend", { text: "Ministérios" }), mins), field("Papel", pap), el("div", { class: "ed-row" }, ok, no)));
      }
    } else {
      const { data, error } = await sb.from("goplan_calendar_lideres").select("*").order("nome");
      body.replaceChildren();
      if (error) { body.append(el("p", { class: "ed-empty", text: "Não foi possível carregar." })); return; }
      for (const l of data) {
        const b = el("button", { type: "button", class: "ed-link", text: l.ativo ? "Desativar" : "Ativar" });
        b.addEventListener("click", async () => { b.disabled = true; await sb.from("goplan_calendar_lideres").update({ ativo: !l.ativo }).eq("email", l.email); clPanel("lid"); });
        body.append(el("div", { class: "ed-card" + (l.ativo ? "" : " off") }, el("div", { class: "ed-cw" }, el("b", { text: l.nome || l.email }), " · " + l.email),
          el("div", { class: "ed-cs", text: (l.papel === "cl" ? "CL · " : "") + (l.ministerios.join(", ") || "sem ministérios") }), el("div", { class: "ed-row" }, b)));
      }
    }
  }

  /* ---------- barra do modo edição ---------- */
  const btn = $("btnEd"), bar = $("edbar");
  async function loadMine() {
    if (!ED.me) { ED.mine = []; return; }
    const { data } = await sb.from("goplan_calendar").select("*").eq("proposto_por", ED.me.id).order("criado_em", { ascending: false }).limit(200);
    ED.mine = data || [];
  }
  function drawBar() {
    btn.setAttribute("aria-pressed", String(ED.on));
    btn.textContent = ED.on ? "✎ Modo edição: ligado" : "✎ Modo edição";
    document.body.classList.toggle("ed-on", ED.on);
    if (!ED.on) { bar.hidden = true; bar.replaceChildren(); return; }
    bar.hidden = false; bar.replaceChildren();
    if (!ED.lider) {
      bar.append(el("span", { text: `Entrou como ${ED.me.email}, mas este email ainda não tem acesso aprovado.` }));
      const out = el("button", { type: "button", class: "ed-link", text: "Sair" }); out.addEventListener("click", () => sb.auth.signOut()); bar.append(out); return;
    }
    const sel = el("select", { "aria-label": "Ministério a editar" });
    if (isCL()) sel.append(el("option", { value: "", text: "Todos os ministérios" }));
    for (const m of myMins()) sel.append(el("option", { value: m, text: m }));
    if (!isCL() && !myMins().includes(ED.min)) ED.min = myMins()[0] || "";
    sel.value = ED.min; sel.addEventListener("change", () => { ED.min = sel.value; st.set("min", ED.min); C.render(); });
    const mine = el("button", { type: "button", class: "ed-btn", text: `As minhas propostas${ED.mine.filter(p => p.estado === "pendente").length ? " (" + ED.mine.filter(p => p.estado === "pendente").length + ")" : ""}` });
    mine.addEventListener("click", minePanel);
    bar.append(el("span", { class: "ed-who", text: ED.lider.nome || ED.me.email }), el("label", { class: "ed-sel" }, el("span", { text: "A editar:" }), sel), mine);
    if (isCL()) { const cl = el("button", { type: "button", class: "ed-btn", text: "CL: propostas e pedidos" }); cl.addEventListener("click", () => clPanel()); bar.append(cl); }
    const out = el("button", { type: "button", class: "ed-link", text: "Sair" }); out.addEventListener("click", async () => { await sb.auth.signOut(); });
    bar.append(out);
    bar.append(el("div", { class: "ed-hint", text: "Toque em «+ Propor data nesta semana» ou em «Mudar data» / «Retirar» num evento. Na linha do tempo, toque num dia vazio da linha do ministério." }));
  }
  async function onSession(session) {
    ED.me = session ? session.user : null;
    if (!ED.me) { ED.lider = null; ED.on = false; ED.mine = []; drawBar(); C.render(); return; }
    const { data } = await sb.from("goplan_calendar_lideres").select("*").eq("email", (ED.me.email || "").toLowerCase()).eq("ativo", true).maybeSingle();
    ED.lider = data || null;
    ED.min = st.get("min", "");
    await loadMine();
    ED.on = st.get("on", "1") === "1";
    drawBar(); C.render();
  }
  if (!sb) return;
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    if (!ED.me) { loginPanel(); return; }
    ED.on = !ED.on; st.set("on", ED.on ? "1" : "0"); closeOpen(); drawBar(); C.render();
  });
  sb.auth.onAuthStateChange((ev, session) => { if (ev === "INITIAL_SESSION" || ev === "SIGNED_IN" || ev === "SIGNED_OUT") setTimeout(() => onSession(session), 0); });
})();
