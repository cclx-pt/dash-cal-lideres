/* Modo edição do Calendário Geral CCLX (só no GitHub Pages).
   O CL regista os líderes (email e ministérios); o líder entra só com o email registado.
   Propostas ficam no Supabase (projeto dash-cal, tabela goplan_calendar). Só a chave pública. */
(() => {
  const SB_URL = "https://qtboyrccpubxwjaudued.supabase.co";
  const SB_KEY = "sb_publishable_nGXTkIM8UREZnk-h7PZYPA_79hsPIjA";
  const C = window.CCLX; if (!C) return;
  const { el, P, iso, MC, DS, MES, MCOL, today, $ } = C;
  const sb = window.supabase && window.supabase.createClient ? window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: false } }) : null;
  const rpc = (fn, args) => sb.rpc(fn, Object.assign({ p_email: ED.me ? ED.me.email : "" }, args || {}));
  const st = { get(k, d) { try { const v = localStorage.getItem("cclx-ed-" + k); return v === null ? d : v; } catch (e) { return d; } },
               set(k, v) { try { localStorage.setItem("cclx-ed-" + k, v); } catch (e) {} } };
  const ED = window.ED = { on: false, me: null, lider: null, min: "", mine: [], props: [], open: null };
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
    const direct = isCL();
    const head = direct ? (kind === "nova" ? "Adicionar evento" : kind === "mudar" ? "Editar evento" : "Eliminar evento")
      : kind === "nova" ? "Propor nova data" : kind === "mudar" ? "Propor mudança de data" : "Propor retirar do calendário";
    box.append(el("div", { class: "ed-fh" }, el("b", { text: head }), r ? el("span", { text: ` · ${r.t} · ${fmtR(r.i, r.f)}` }) : null));
    const inp = (type, attrs) => el("input", Object.assign({ type }, attrs || {}));
    let tTitulo, tIni, tFim, tHora, tAmb, tCom, tVis, tMin, tMot;
    const grid = el("div", { class: "ed-grid" });
    if (kind === "mudar" && direct) { tTitulo = inp("text", { maxlength: "120", value: r.t }); grid.append(field("Título", tTitulo)); }
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
      tAmb = el("select", {}); [["Igreja", "Geral"], ["Regional", "Regional"], ["Comunidade", "Local (uma comunidade)"]].forEach(([v, t]) => tAmb.append(el("option", { value: v, text: t })));
      tCom = el("select", {}); COMS.forEach(c => tCom.append(el("option", { value: c, text: c })));
      const fc = field("Comunidade", tCom); fc.hidden = true;
      tAmb.addEventListener("change", () => { fc.hidden = tAmb.value !== "Comunidade"; });
      tVis = el("select", {}); [["publico", "Pública"], ["interno", "Interna (só equipa)"]].forEach(([v, t]) => tVis.append(el("option", { value: v, text: t })));
      grid.append(field("Âmbito", tAmb), fc, field("Visibilidade", tVis));
    }
    box.append(grid);
    if (kind === "retirar" && !direct) {
      const go = el("button", { type: "button", class: "ed-link", text: "Mudar data" });
      go.addEventListener("click", () => {
        const wrap = box.closest(".ed-li"), prev = wrap ? wrap.previousElementSibling : null, par = box.parentNode;
        const f = form("mudar", ctx);
        if (prev) { const nl = el("li", { class: "ed-li" }, f); prev.after(nl); ED.open = nl; } else par.append(f);
        f.querySelector("input")?.focus();
      });
      box.append(el("div", { class: "ed-tip" }, "Quer passar para outro dia? Use ", go, ". Assim o CL decide a mudança de uma só vez."));
    }
    tMot = el("textarea", { rows: "2", maxlength: "600", placeholder: direct ? "Opcional: nota para o registo" : kind === "nova" ? "Para quem é, o que é, notas para o CL" : "Porque propõe esta alteração" });
    box.append(field(direct ? "Nota (opcional)" : kind === "nova" ? "Descrição e notas" : "Motivo", tMot));
    let av = avBox([]); box.append(av);
    const upd = () => { if (kind === "retirar") { av.replaceWith(av = el("div")); return; } const n = avBox(avisos(tIni.value, tFim.value, r && r.id)); av.replaceWith(n); av = n; };
    if (tIni) { tIni.addEventListener("input", upd); tFim.addEventListener("input", upd); }
    upd();
    const msg = el("div", { class: "ed-msg", role: "status" });
    const sendTxt = direct ? (kind === "retirar" ? "Eliminar" : "Guardar") : "Enviar proposta";
    const send = el("button", { type: "submit", class: "ed-btn pri", text: sendTxt });
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
        Object.assign(row, { ministerio: r.m, evento_id: r.id, evento_titulo: r.t, data_atual: r.i, data_atual_fim: r.f || null, titulo: tTitulo ? (tTitulo.value.trim() || r.t) : r.t });
        if (!row.motivo && !direct) { msg.textContent = "Escreva o motivo."; tMot.focus(); return; }
      }
      if (tIni) {
        if (!tIni.value) { msg.textContent = "Escolha a data."; tIni.focus(); return; }
        if (tFim.value && tFim.value < tIni.value) { msg.textContent = "A data final é antes da inicial."; tFim.focus(); return; }
        if (kind === "mudar" && tIni.value === r.i && (tFim.value || "") === (r.f || "") && row.titulo === r.t && (tHora.value.trim() || "") === (r.h || "")) { msg.textContent = direct ? "Não há nada alterado." : "A nova data é igual à atual."; return; }
        row.data_inicio = tIni.value; row.data_fim = tFim.value || null; row.hora = tHora.value.trim() || null;
        const avs = avisos(tIni.value, tFim.value, r && r.id);
        const er = avs.find(x => x[0] === "erro"); if (er) { msg.textContent = er[1]; tIni.focus(); return; }
        row.avisos = avs.map(x => x[1]);
      }
      send.disabled = true; send.textContent = direct ? "A guardar…" : "A enviar…";
      const { error } = await rpc(direct ? "goplan_cal_cl_aplicar" : "goplan_cal_propor", { p: row });
      send.disabled = false; send.textContent = sendTxt;
      if (error) { msg.textContent = /permiss|acesso/i.test(error.message) ? "Não tem permissão para propor neste ministério." : "Não foi possível enviar. Tente de novo."; return; }
      closeOpen(); await loadMine(); if (direct) await loadOverlay(); C.render();
      toast(direct ? (kind === "retirar" ? "Eliminado. Já não aparece no calendário." : "Guardado. Já aparece no calendário.") : "Proposta enviada ao CL. Pode acompanhar em «As minhas propostas».");
    });
    ED.open = box;
    return box;
  }

  /* ---------- ganchos chamados pela página ---------- */
  const dm = s => { const d = P(s); return `${d.getDate()}/${MC[d.getMonth()]}`; };
  const pLab = p => p.tipo === "nova" ? "nova" : p.tipo === "retirar" ? "retirar" : `mudar para ${DS[P(p.data_inicio).getDay()]} ${dm(p.data_inicio)}`;
  const pTag = (p, txt) => el("span", { class: "tag sent", text: `Proposta ${p.ministerio} · ${txt || pLab(p)}` });
  const pend = () => ED.props.filter(p => p.estado === "pendente");
  function pInfo(p) {
    const quem = p.nome || p.email || "";
    const bits = [`Proposta por ${quem}${quem ? ", " : ""}${new Date(p.criado_em).toLocaleDateString("pt-PT")}`];
    if (p.tipo === "mudar") bits.push(`De ${fmtR(p.data_atual, p.data_atual_fim)} para ${fmtR(p.data_inicio, p.data_fim)}`);
    if (p.hora) bits.push("Hora: " + p.hora);
    if (p.motivo) bits.push((p.tipo === "nova" ? "Notas: " : "Motivo: ") + p.motivo);
    bits.push("Aguarda decisão do CL.");
    return el("div", { class: "ed-pinfo", text: bits.join(" · ") });
  }
  function toggleInfo(tx, p) { const o = tx.querySelector(".ed-pinfo"); if (o) o.remove(); else tx.append(pInfo(p)); }
  ED.item = (li, r) => {
    const tx = li.querySelector(".tx");
    for (const p of pend().filter(p => p.evento_id === r.id)) {
      li.classList.add(p.tipo === "retirar" ? "ed-ret" : "ed-mov");
      const t = pTag(p); t.setAttribute("role", "button"); t.tabIndex = 0; t.title = "Ver detalhes da proposta";
      t.addEventListener("click", () => toggleInfo(tx, p)); t.addEventListener("keydown", e => { if (e.key === "Enter") toggleInfo(tx, p); });
      tx.querySelector(".tags").append(t);
    }
    if (!ED.on || !canEdit(r)) return;
    const a = el("div", { class: "ed-row" });
    const b1 = el("button", { type: "button", class: "ed-link", text: isCL() ? "Editar" : "Mudar data" });
    const b2 = el("button", { type: "button", class: "ed-link", text: isCL() ? "Eliminar" : "Retirar" });
    b1.addEventListener("click", () => { const f = form("mudar", { r }); li.after(el("li", { class: "ed-li" }, f)); ED.open = f.parentNode; f.querySelector("input,textarea")?.focus(); });
    b2.addEventListener("click", () => { const f = form("retirar", { r }); li.after(el("li", { class: "ed-li" }, f)); ED.open = f.parentNode; f.querySelector("textarea")?.focus(); });
    a.append(b1, b2); tx.append(a);
  };
  ED.hasIn = (a, b) => pend().some(p => p.tipo !== "retirar" && p.data_inicio >= a && p.data_inicio <= b);
  ED.week = (col, ctx) => {
    const here = pend().filter(p => p.tipo !== "retirar" && p.data_inicio >= ctx.wIso && p.data_inicio <= ctx.eIso).sort((x, y) => x.data_inicio.localeCompare(y.data_inicio));
    if (here.length) {
      let ul = col.querySelector("ul.lst");
      if (!ul) { ul = el("ul", { class: "lst" }); col.querySelector(".none")?.remove(); col.prepend(ul); }
      for (const p of here) {
        const tx = el("div", { class: "tx" }, el("div", { class: "ti", text: p.tipo === "nova" ? p.titulo : p.evento_titulo }),
          el("div", { class: "tags" }, el("span", { class: "tag min", text: p.ministerio, style: `--mc:${MCOL[p.ministerio] || "#8a8a86"}` }), pTag(p, p.tipo === "nova" ? "nova" : `vem de ${dm(p.data_atual)}`)));
        const li = el("li", { class: "it ed-pr", "data-i": p.data_inicio, tabindex: "0", role: "button", title: "Ver detalhes da proposta" }, C.dateCell({ i: p.data_inicio, f: p.data_fim || "" }), tx);
        li.addEventListener("click", e => { if (!e.target.closest(".ed-pinfo")) toggleInfo(tx, p); });
        li.addEventListener("keydown", e => { if (e.key === "Enter") toggleInfo(tx, p); });
        const nxt = [...ul.children].find(x => (x.dataset.i || "") > p.data_inicio);
        nxt ? nxt.before(li) : ul.append(li);
      }
    }
    if (!ED.on || !ED.lider || !myMins().length) return;
    const b = el("button", { type: "button", class: "ed-add", text: isCL() ? "+ Adicionar evento nesta semana" : "+ Propor data nesta semana" });
    b.addEventListener("click", () => { const f = form("nova", ctx); b.after(f); f.querySelector("select,input")?.focus(); });
    col.append(b);
  };
  ED.flag = r => { const p = pend().find(p => p.evento_id === r.id); return !p ? "" : p.tipo === "retirar" ? " lpr" : " lpo"; };
  ED.tlItems = () => pend().filter(p => p.tipo !== "retirar").map(p => ({ k: "geral", m: p.ministerio, e: "proposta", v: "publico", i: p.data_inicio, f: p.data_fim || "", t: p.tipo === "nova" ? p.titulo : p.evento_titulo, pr: p }));
  ED.tlTag = (tags, r) => {
    if (r.pr) { tags.replaceChildren(el("span", { class: "tag min", text: r.m, style: `--mc:${MCOL[r.m] || "#8a8a86"}` }), pTag(r.pr, r.pr.tipo === "nova" ? "nova" : `vem de ${dm(r.pr.data_atual)}`)); tags.after(pInfo(r.pr)); return; }
    for (const p of pend().filter(p => p.evento_id === r.id)) tags.append(pTag(p));
  };
  ED.det = (det, r) => {
    if (!ED.on || !canEdit(r)) return;
    const a = el("div", { class: "ed-row" });
    const b1 = el("button", { type: "button", class: "ed-link", text: isCL() ? "Editar" : "Mudar data" });
    const b2 = el("button", { type: "button", class: "ed-link", text: isCL() ? "Eliminar" : "Retirar" });
    b1.addEventListener("click", () => { det.append(form("mudar", { r })); });
    b2.addEventListener("click", () => { det.append(form("retirar", { r })); });
    a.append(b1, b2); det.append(a);
  };
  ED.lanes = () => !ED.lider ? [] : ED.min ? [ED.min] : isCL() ? [] : myMins();
  ED.tlNew = (det, dia, m) => {
    if (!ED.on || !ED.lider || !(ED.min ? m === ED.min : myMins().includes(m))) return false;
    const prev = ED.min; if (!ED.min) ED.min = m;
    det.replaceChildren(el("div", {}, el("b", { text: `${isCL() ? "Adicionar evento" : "Novo evento"} · ${m}` }), " · " + fmt(dia)), form("nova", { dia }));
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

  /* entrada: só o email registado pelo CL (sem código) */
  function loginPanel(pref) {
    const em = el("input", { type: "email", autocomplete: "email", required: "", placeholder: "nome@exemplo.pt", value: pref || st.get("email", "") });
    const msg = el("div", { class: "ed-msg", role: "status" });
    const go = el("button", { type: "submit", class: "ed-btn pri", text: "Entrar" });
    const f = el("form", { class: "ed-pf" }, el("p", { text: "Para propor datas, escreva o email registado pelo CL." }), field("Email", em), el("div", { class: "ed-act" }, go, msg));
    f.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const email = em.value.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Escreva um email válido."; return; }
      go.disabled = true; go.textContent = "A verificar…";
      const { data, error } = await sb.rpc("goplan_cal_entrar", { p_email: email });
      go.disabled = false; go.textContent = "Entrar";
      if (error) { msg.textContent = "Não foi possível ligar. Tente de novo."; return; }
      if (!data) { pedirPanel(email); return; }
      st.set("email", email); st.set("on", "1");
      dlg.close(); await entrar(email, data);
    });
    const req = el("button", { type: "button", class: "ed-link", text: "Primeira vez? Pedir acesso" });
    req.addEventListener("click", () => pedirPanel(em.value.trim().toLowerCase()));
    panel("Propor datas", f, el("div", { class: "ed-foot" }, req));
    em.focus();
  }
  function pedirPanel(email) {
    const nm = el("input", { type: "text", autocomplete: "name", required: "", maxlength: "120" });
    const em = el("input", { type: "email", autocomplete: "email", required: "", value: email || "" });
    const mins = el("div", { class: "ed-mins" });
    for (const m of allMins()) mins.append(el("label", {}, el("input", { type: "checkbox", value: m }), " " + m));
    const msg = el("div", { class: "ed-msg", role: "status" });
    const go = el("button", { type: "submit", class: "ed-btn pri", text: "Pedir acesso" });
    const f = el("form", { class: "ed-pf" },
      el("p", { text: email ? "Este email ainda não tem acesso. Indique o nome e o ministério (ou ministérios) para que vai propor datas. O CL confirma o pedido e depois já pode entrar com este email." : "Indique o nome, o email e o ministério (ou ministérios) para que vai propor datas. O CL confirma o pedido e depois já pode entrar com este email." }),
      field("Nome", nm), field("Email", em), el("fieldset", { class: "ed-fs" }, el("legend", { text: "Ministério(s) para que vai propor" }), mins), el("div", { class: "ed-act" }, go, msg));
    f.addEventListener("submit", async e => {
      e.preventDefault(); msg.textContent = "";
      const mail = em.value.trim().toLowerCase(), nome = nm.value.trim(), ms = [...mins.querySelectorAll("input:checked")].map(x => x.value);
      if (nome.length < 2) { msg.textContent = "Escreva o nome."; nm.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { msg.textContent = "Escreva um email válido."; em.focus(); return; }
      if (!ms.length) { msg.textContent = "Escolha pelo menos um ministério."; return; }
      go.disabled = true; go.textContent = "A enviar…";
      const { data, error } = await sb.rpc("goplan_cal_pedir", { p_email: mail, p_nome: nome, p_ministerios: ms, p_mensagem: "" });
      go.disabled = false; go.textContent = "Pedir acesso";
      if (error) { msg.textContent = /Muitos/.test(error.message) ? "Há muitos pedidos neste momento. Tente mais tarde." : "Não foi possível enviar o pedido. Tente de novo."; return; }
      st.set("email", mail);
      const txt = data === "ativo" ? "Este email já tem acesso. Pode entrar já." : data === "pendente" ? "Já existe um pedido para este email. Aguarde a confirmação do CL." : "Pedido enviado ao CL. Quando for confirmado, entre em «Propor datas» com este email.";
      const ok = el("button", { type: "button", class: "ed-btn pri", text: data === "ativo" ? "Entrar" : "Fechar" });
      ok.addEventListener("click", () => data === "ativo" ? loginPanel(mail) : dlg.close());
      panel("Pedir acesso", el("div", { class: "ed-pf" }, el("p", {}, el("b", { text: nome }), " · " + mail), el("p", { text: txt }), el("div", { class: "ed-act" }, ok)));
    });
    panel("Pedir acesso", f);
    (email ? nm : em).focus();
  }
  /* as minhas propostas */
  const EST = { pendente: "Pendente", aceite: "Aprovada", recusada: "Rejeitada", outra_data: "Pedida outra data", cancelada: "Cancelada" };
  const TIPO = { nova: "Nova data", mudar: "Mudar data", retirar: "Retirar" };
  const TIPO_CL = { nova: "Adicionado pelo CL", mudar: "Editado pelo CL", retirar: "Eliminado pelo CL" };
  function propCard(p, actions) {
    const what = p.tipo === "nova" ? `${p.titulo} · ${fmtR(p.data_inicio, p.data_fim)}` : p.tipo === "mudar" ? `${p.evento_titulo} · de ${fmtR(p.data_atual, p.data_atual_fim)} para ${fmtR(p.data_inicio, p.data_fim)}` : `${p.evento_titulo} · ${fmtR(p.data_atual, p.data_atual_fim)}`;
    const c = el("div", { class: "ed-card" },
      el("div", { class: "ed-ch" }, el("span", { class: "tag min", text: p.ministerio, style: `--mc:${MCOL[p.ministerio] || "#8a8a86"}` }), el("span", { class: "tag", text: (p.origem === "cl" ? TIPO_CL : TIPO)[p.tipo] }), el("span", { class: "tag est-" + p.estado, text: EST[p.estado] + (p.estado === "aceite" ? (p.importado_em ? " · importada" : " · já no site") : "") })),
      el("div", { class: "ed-cw", text: what }),
      p.hora ? el("div", { class: "ed-cs", text: "Hora: " + p.hora }) : null,
      p.tipo === "mudar" && p.titulo && p.titulo !== p.evento_titulo ? el("div", { class: "ed-cs", text: "Novo título: " + p.titulo }) : null,
      p.motivo ? el("div", { class: "ed-cs", text: (p.tipo === "nova" ? "Notas: " : p.origem === "cl" ? "Nota: " : "Motivo: ") + p.motivo }) : null,
      (p.avisos || []).length ? el("div", { class: "ed-cs ed-cav", text: "Avisos: " + p.avisos.join(" ") }) : null,
      el("div", { class: "ed-cs", text: `${p.nome || p.email} · ${new Date(p.criado_em).toLocaleDateString("pt-PT")}${p.decidido_por && p.origem !== "cl" ? ` · decidido por ${p.decidido_por}` : ""}` }),
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
        b.addEventListener("click", async () => { b.disabled = true; const { data: okc, error } = await rpc("goplan_cal_cancelar", { p_id: p.id }); if (error || !okc) { b.disabled = false; toast("Não foi possível cancelar."); return; } await loadMine(); C.render(); minePanel(); });
        act = el("div", { class: "ed-row" }, b);
      }
      list.append(propCard(p, act));
    }
    panel("As minhas propostas", list);
  }

  /* CL: propostas e pedidos de acesso */
  let clTab = "prop";
  ED.renderProp = host => clPanel(clTab, host);
  async function clPanel(tab, host) {
    tab = tab || clTab; clTab = tab; host = host || $("out");
    if (!isCL()) { host.replaceChildren(el("div", { class: "empty", text: "Só o CL vê esta secção." })); return; }
    const tabs = el("div", { class: "vseg ed-tabs" });
    for (const [k, t] of [["prop", "Propostas"], ["lid", "Líderes e pedidos de acesso"]]) {
      const b = el("button", { type: "button", "aria-pressed": String(k === tab), text: t }); b.addEventListener("click", () => clPanel(k)); tabs.append(b);
    }
    const body = el("div", { class: "ed-list ed-sec" }, el("p", { class: "ed-empty", text: "A carregar…" }));
    host.replaceChildren(el("section", { class: "ed-clsec" }, el("h2", { class: "ed-clh", text: "Conselho de Liderança" }), tabs, body));
    if (tab === "prop") {
      const flt = st.get("clEst", "pendente");
      const { data, error } = await rpc("goplan_cal_propostas");
      body.replaceChildren();
      if (error) { body.append(el("p", { class: "ed-empty", text: "Não foi possível carregar." })); return; }
      const sel = el("select", { "aria-label": "Estado" }); for (const [v, t] of [["pendente", "Por decidir"], ["aceite", "Aprovadas (por importar)"], ["recusada", "Rejeitadas"], ["", "Todas"]]) sel.append(el("option", { value: v, text: t }));
      sel.value = flt; sel.addEventListener("change", () => { st.set("clEst", sel.value); clPanel("prop"); });
      body.append(el("div", { class: "ed-row" }, sel, el("span", { class: "ed-cs", text: "O que aprova aparece logo no calendário do site. Fica guardado na página de gestão quando pedir «importar alterações»." })));
      const rows = data.filter(p => !flt ? true : flt === "aceite" ? p.estado === "aceite" && !p.importado_em : p.estado === flt);
      if (!rows.length) body.append(el("p", { class: "ed-empty", text: "Nada por aqui." }));
      for (const p of rows) {
        let act = null;
        if (p.estado === "pendente") {
          const nota = el("input", { type: "text", maxlength: "300", placeholder: "Nota para o líder (obrigatória ao recusar ou pedir outra data)" });
          const mk = (t, est, cls) => { const b = el("button", { type: "button", class: "ed-btn " + (cls || ""), text: t }); b.addEventListener("click", async () => {
            if (est !== "aceite" && !nota.value.trim()) { nota.focus(); nota.placeholder = "Escreva a nota para o líder"; return; }
            b.disabled = true; const { error: e2 } = await rpc("goplan_cal_decidir", { p_id: p.id, p_estado: est, p_nota: nota.value.trim() });
            if (e2) { b.disabled = false; toast("Não foi possível guardar."); return; } toast(EST[est] + "."); await loadMine(); await loadOverlay(); drawBar(); C.render(); }); return b; };
          nota.placeholder = "Nota para o líder (obrigatória ao rejeitar ou pedir outra data)";
          act = el("div", { class: "ed-dec" }, nota, el("div", { class: "ed-row" }, mk("Aprovar", "aceite", "pri"), mk("Rejeitar", "recusada"), mk("Pedir outra data", "outra_data")));
        } else if (p.estado === "aceite" && !p.importado_em) {
          const u = el("button", { type: "button", class: "ed-link", text: p.origem === "cl" ? "Anular esta alteração" : "Anular aprovação (volta a pendente)" });
          u.addEventListener("click", async () => { u.disabled = true; const { error: e4 } = await rpc("goplan_cal_anular", { p_id: p.id }); if (e4) { u.disabled = false; toast("Não foi possível anular."); return; } toast("Anulado."); await loadMine(); await loadOverlay(); drawBar(); C.render(); });
          act = el("div", { class: "ed-row" }, u);
        }
        body.append(propCard(p, act));
      }
    } else {
      const { data, error } = await rpc("goplan_cal_lideres");
      body.replaceChildren();
      if (error) { body.append(el("p", { class: "ed-empty", text: "Não foi possível carregar." })); return; }
      const pend = data.filter(l => !l.ativo && l.pedido_em), rest = data.filter(l => !(!l.ativo && l.pedido_em));
      body.append(el("h4", { class: "ed-h4", text: `Pedidos de acesso (${pend.length})` }));
      if (!pend.length) body.append(el("p", { class: "ed-empty", text: "Não há pedidos por confirmar." }));
      for (const l of pend) {
        const b = el("button", { type: "button", class: "ed-btn pri", text: "Ativar" });
        b.addEventListener("click", async () => { b.disabled = true; const { error: e3 } = await rpc("goplan_cal_lider_ativo", { p_alvo: l.email, p_ativo: true }); if (e3) toast("Não foi possível ativar."); clPanel("lid"); });
        body.append(el("div", { class: "ed-card" }, el("div", { class: "ed-cw" }, el("b", { text: l.nome || l.email }), " · " + l.email),
          el("div", { class: "ed-cs", text: (l.ministerios || []).join(", ") }), l.mensagem ? el("div", { class: "ed-cs", text: l.mensagem }) : null,
          el("div", { class: "ed-cs", text: "Pedido a " + new Date(l.pedido_em).toLocaleDateString("pt-PT") }), el("div", { class: "ed-row" }, b)));
      }
      body.append(el("h4", { class: "ed-h4", text: "Líderes" }));
      for (const l of rest) {
        const b = el("button", { type: "button", class: "ed-link", text: l.ativo ? "Desativar" : "Ativar" });
        b.addEventListener("click", async () => { b.disabled = true; const { error: e3 } = await rpc("goplan_cal_lider_ativo", { p_alvo: l.email, p_ativo: !l.ativo }); if (e3) toast("Não foi possível alterar."); clPanel("lid"); });
        body.append(el("div", { class: "ed-card" + (l.ativo ? "" : " off") }, el("div", { class: "ed-cw" }, el("b", { text: l.nome || l.email }), " · " + l.email),
          el("div", { class: "ed-cs", text: (l.papel === "cl" ? "CL · " : "") + (l.ministerios.join(", ") || "sem ministérios") }), el("div", { class: "ed-row" }, b)));
      }
    }
  }

  /* ---------- barra do modo edição ---------- */
  const btn = $("btnEd"), bar = $("edbar");
  async function loadOverlay() {
    const { data, error } = await sb.rpc("goplan_cal_aplicadas");
    if (!error) C.setOverlay(data || []);
  }
  ED.reloadOverlay = loadOverlay;
  async function loadMine() {
    if (!ED.me) { ED.mine = []; return; }
    const { data } = await rpc("goplan_cal_propostas");
    const all = data || [];
    ED.mine = all.filter(p => p.email === ED.me.email);
    ED.props = all.filter(p => p.estado === "pendente");
    const vb = $("vProp"); if (vb) { vb.hidden = !isCL(); vb.textContent = `Propostas${ED.props.length ? " (" + ED.props.length + ")" : ""}`; }
  }
  function drawBar() {
    btn.setAttribute("aria-pressed", String(ED.on));
    $("btnEdT").textContent = ED.on ? "A propor datas" : "Propor datas";
    document.body.classList.toggle("ed-on", ED.on);
    if (!ED.on) { bar.hidden = true; bar.replaceChildren(); return; }
    bar.hidden = false; bar.replaceChildren();
    if (!ED.lider) {
      bar.append(el("span", { text: `Entrou como ${ED.me.email}, mas este email ainda não tem acesso aprovado.` }));
      const out = el("button", { type: "button", class: "ed-link", text: "Sair" }); out.addEventListener("click", sair); bar.append(out); return;
    }
    const sel = el("select", { "aria-label": "Ministério a editar" });
    if (isCL()) sel.append(el("option", { value: "", text: "Todos os ministérios" }));
    for (const m of myMins()) sel.append(el("option", { value: m, text: m }));
    if (!isCL() && !myMins().includes(ED.min)) ED.min = myMins()[0] || "";
    sel.value = ED.min; sel.addEventListener("change", () => { ED.min = sel.value; st.set("min", ED.min); C.render(); });
    const mine = el("button", { type: "button", class: "ed-btn", text: `As minhas propostas${ED.mine.filter(p => p.estado === "pendente").length ? " (" + ED.mine.filter(p => p.estado === "pendente").length + ")" : ""}` });
    mine.addEventListener("click", minePanel);
    bar.append(el("span", { class: "ed-who", text: ED.lider.nome || ED.me.email }), el("label", { class: "ed-sel" }, el("span", { text: "A editar:" }), sel), mine);
    if (isCL()) { const cl = el("button", { type: "button", class: "ed-btn", text: `Propostas por decidir (${ED.props.length})` }); cl.addEventListener("click", () => C.setVista("prop")); bar.append(cl); }
    const out = el("button", { type: "button", class: "ed-link", text: "Sair" }); out.addEventListener("click", sair);
    bar.append(out);
    bar.append(el("div", { class: "ed-hint", text: isCL() ? "Modo CL: «+ Adicionar evento nesta semana», ou «Editar» / «Eliminar» num evento. Fica logo no calendário do site. As propostas dos líderes estão em «Propostas»." : "Toque em «+ Propor data nesta semana» ou em «Mudar data» / «Retirar» num evento. Na linha do tempo, toque num dia vazio da linha do ministério." }));
  }
  async function entrar(email, lid) {
    ED.me = { email }; ED.lider = lid ? { ...lid, ministerios: lid.ministerios || [] } : null;
    if (!ED.lider) { sair(); return; }
    ED.min = st.get("min", "");
    await loadMine();
    ED.on = st.get("on", "1") === "1";
    drawBar(); C.render();
  }
  function sair() {
    st.set("email", ""); ED.me = null; ED.lider = null; ED.on = false; ED.mine = []; ED.props = [];
    const vb = $("vProp"); if (vb) vb.hidden = true; if (C.vista() === "prop") C.setVista("meses");
    closeOpen(); drawBar(); C.render();
  }
  if (!sb) return;
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    if (!ED.me) { loginPanel(); return; }
    ED.on = !ED.on; st.set("on", ED.on ? "1" : "0"); closeOpen(); drawBar(); C.render();
  });
  /* alterações aprovadas ainda não importadas: aplicadas para todos os visitantes */
  loadOverlay();
  /* retoma a entrada guardada neste dispositivo, se o email continuar registado */
  const saved = st.get("email", "");
  if (saved) sb.rpc("goplan_cal_entrar", { p_email: saved }).then(({ data }) => { if (data) entrar(saved, data); else st.set("email", ""); });
})();
