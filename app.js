/* Calculadora da Contadoria — CEPREC/PGE-MT. Interface; o cálculo está em js/engine.js. */
const E = window.CeprecEngine;

// ---------------------------------------------------------------- modelos
const MOTIVOS_PADRAO = [
  "base de cálculo maior que a apurada na ficha financeira",
  "não aplicou corretamente os índices de correção e juros"
];

const MODELS = [
  {
    id: "terco-efetivo",
    group: "coletivas",
    name: "Terço de férias — professor efetivo",
    note: "1/3 sobre os 15 dias adicionais de férias (45 dias). Férias 15 dias = subsídio ÷ 2 × meses ÷ 12; terço = férias 15 dias ÷ 3.",
    columns: [
      { key: "vinculo", label: "Ano/Vínculo", type: "text" },
      { key: "dataInicial", label: "Data inicial", type: "date" },
      { key: "meses", label: "Meses", type: "number" },
      { key: "subsidio", label: "Subsídio", type: "money" },
      { key: "ferias15", label: "Férias 15 dias", type: "calc" },
      { key: "valor", label: "Valor 1/3 15 dias", type: "calc" }
    ],
    example: [{ vinculo: "2013", dataInicial: "2013-07-31", meses: 12, subsidio: 4081.41 }],
    blank: { vinculo: "", dataInicial: "", meses: 12, subsidio: 0 },
    derive(row) {
      const r = E.tercoEfetivo(num(row.subsidio), num(row.meses, 12));
      return { ferias15: r.ferias15, valor: r.terco, termoCorrecao: row.dataInicial };
    },
    motivos: MOTIVOS_PADRAO,
    flags: ["A proporcionalização por meses (× meses ÷ 12) deve ser confirmada pela Contadoria."]
  },
  {
    id: "terco-temporario",
    group: "coletivas",
    name: "Terço de férias — professor temporário",
    note: "Por vínculo: subsídio da rescisão × avos ÷ 24 (1/3 de 45 dias por avo). Correção desde a data final do vínculo. Períodos quitados em acordo são excluídos.",
    columns: [
      { key: "vinculo", label: "Ano/Vínculo", type: "text" },
      { key: "dataInicial", label: "Data inicial", type: "date" },
      { key: "dataFinal", label: "Data final", type: "date" },
      { key: "subsidio", label: "Subsídio da rescisão", type: "money" },
      { key: "avos", label: "Avos", type: "avos" },
      { key: "acordo", label: "Quitado em acordo", type: "check" },
      { key: "valor", label: "Valor 1/3 férias", type: "calc" }
    ],
    example: [
      { vinculo: "2017/012", dataInicial: "2017-03-01", dataFinal: "2017-12-01", subsidio: 2128.5, avos: "" },
      { vinculo: "2018/018", dataInicial: "2018-02-05", dataFinal: "2018-12-01", subsidio: 435.27, avos: "" },
      { vinculo: "2018/021", dataInicial: "2018-06-14", dataFinal: "2018-07-01", subsidio: 1703.64, avos: "" }
    ],
    blank: { vinculo: "", dataInicial: "", dataFinal: "", subsidio: 0, avos: "", acordo: false },
    derive(row) {
      const auto = E.avosVinculo(row.dataInicial, row.dataFinal);
      const manual = row.avos !== "" && row.avos !== null && row.avos !== undefined && Number.isFinite(Number(row.avos));
      const avos = manual ? Number(row.avos) : auto.avos;
      const valor = row.acordo ? 0 : E.tercoTemporario(num(row.subsidio), avos);
      return { avosAuto: auto.avos, avosMotivo: auto.motivo, avosUsado: avos, valor, termoCorrecao: row.dataFinal };
    },
    motivos: [...MOTIVOS_PADRAO, "incluiu períodos cujo vínculo foi inferior a 15 dias", "incluiu período quitado em acordo"],
    flags: ["Regra dos avos (meses completos + 1 quando a fração tiver 15 dias ou mais; vínculo inferior a 15 dias = 0) a confirmar pela Contadoria. O campo Avos pode ser corrigido manualmente."]
  },
  {
    id: "licenca-premio",
    group: "coletivas",
    name: "Licença-prêmio não usufruída",
    note: "Último subsídio em atividade × (dias em saldo ÷ 30). Correção desde a aposentadoria; juros desde a citação.",
    params: [{ key: "aposentadoria", label: "Data da aposentadoria (termo da correção)", type: "date" }],
    exampleParams: { aposentadoria: "2009-02-05" },
    columns: [
      { key: "periodo", label: "Período aquisitivo", type: "text" },
      { key: "dias", label: "Dias em saldo", type: "number" },
      { key: "subsidio", label: "Último subsídio em atividade", type: "money" },
      { key: "meses", label: "Meses", type: "calc-num" },
      { key: "valor", label: "Subsídio × meses", type: "calc" }
    ],
    example: [{ periodo: "Períodos aquisitivos (RH)", dias: 180, subsidio: 986.05 }],
    blank: { periodo: "", dias: 90, subsidio: 0 },
    derive(row, params) {
      const r = E.licencaPremio(num(row.subsidio), num(row.dias));
      return { meses: r.meses, valor: r.valor, termoCorrecao: params.aposentadoria };
    },
    motivos: [...MOTIVOS_PADRAO],
    flags: []
  },
  {
    id: "certidao-credito",
    group: "individuais",
    name: "Certidão de crédito (SAD)",
    note: "Base: somente o valor bruto, sem honorários. Correção desde a expedição da certidão; juros desde a citação.",
    columns: [
      { key: "certidao", label: "Nº da certidão", type: "text" },
      { key: "expedicao", label: "Data de expedição", type: "date" },
      { key: "bruto", label: "Valor bruto", type: "money" },
      { key: "valor", label: "Base de cálculo", type: "calc" }
    ],
    example: [{ certidao: "", expedicao: "2011-06-30", bruto: 20288.08 }],
    blank: { certidao: "", expedicao: "", bruto: 0 },
    derive(row) { return { valor: E.round2(num(row.bruto)), termoCorrecao: row.expedicao }; },
    motivos: [...MOTIVOS_PADRAO, "utilizou o valor líquido ou incluiu honorários na base"],
    flags: []
  },
  {
    id: "honorarios-fixos",
    group: "individuais",
    name: "Honorários sucumbenciais — valor fixo",
    note: "Correção desde a fixação (em regra, a sentença); juros desde o trânsito em julgado da decisão que os fixou.",
    columns: [
      { key: "descricao", label: "Descrição", type: "text" },
      { key: "fixacao", label: "Data da fixação", type: "date" },
      { key: "transito", label: "Trânsito em julgado", type: "date" },
      { key: "base", label: "Valor fixado", type: "money" },
      { key: "valor", label: "Base de cálculo", type: "calc" }
    ],
    example: [{ descricao: "Honorários fixados na sentença", fixacao: "2019-05-10", transito: "2020-02-14", base: 5000 }],
    blank: { descricao: "", fixacao: "", transito: "", base: 0 },
    derive(row) { return { valor: E.round2(num(row.base)), termoCorrecao: row.fixacao, termoJuros: row.transito || null }; },
    usaCitacao: false,
    motivos: [...MOTIVOS_PADRAO, "adotou termos iniciais diversos dos fixados para honorários"],
    flags: []
  },
  {
    id: "honorarios-percentuais",
    group: "individuais",
    name: "Honorários sucumbenciais — percentual sobre o valor da causa",
    note: "Correção desde o ajuizamento (Súmula 14/STJ); juros desde a intimação para o cumprimento de sentença.",
    columns: [
      { key: "descricao", label: "Descrição", type: "text" },
      { key: "ajuizamento", label: "Ajuizamento", type: "date" },
      { key: "intimacao", label: "Intimação p/ cumprimento", type: "date" },
      { key: "valorCausa", label: "Valor da causa", type: "money" },
      { key: "percentual", label: "Percentual (%)", type: "number" },
      { key: "valor", label: "Base de cálculo", type: "calc" }
    ],
    example: [{ descricao: "Honorários de 10%", ajuizamento: "2018-03-01", intimacao: "2022-08-15", valorCausa: 60000, percentual: 10 }],
    blank: { descricao: "", ajuizamento: "", intimacao: "", valorCausa: 0, percentual: 10 },
    derive(row) {
      return { valor: E.round2(num(row.valorCausa) * num(row.percentual) / 100), termoCorrecao: row.ajuizamento, termoJuros: row.intimacao || null };
    },
    usaCitacao: false,
    motivos: [...MOTIVOS_PADRAO, "adotou termos iniciais diversos dos fixados para honorários"],
    flags: []
  },
  {
    id: "parcelas",
    group: "individuais",
    name: "Parcelas avulsas (diferenças remuneratórias)",
    note: "Uma linha por parcela, com o vencimento como termo inicial da correção; juros desde a citação ou do vencimento, se posterior.",
    columns: [
      { key: "descricao", label: "Competência / descrição", type: "text" },
      { key: "vencimento", label: "Vencimento", type: "date" },
      { key: "base", label: "Valor devido", type: "money" },
      { key: "valor", label: "Base de cálculo", type: "calc" }
    ],
    example: [
      { descricao: "Diferença 01/2020", vencimento: "2020-01-31", base: 350 },
      { descricao: "Diferença 02/2020", vencimento: "2020-02-29", base: 350 }
    ],
    blank: { descricao: "", vencimento: "", base: 0 },
    derive(row) { return { valor: E.round2(num(row.base)), termoCorrecao: row.vencimento }; },
    motivos: [...MOTIVOS_PADRAO],
    flags: []
  }
];

const GROUPS = [
  { id: "coletivas", name: "Execuções Coletivas" },
  { id: "individuais", name: "Execuções Individuais" }
];

// ---------------------------------------------------------------- estado
const state = {
  groupId: "coletivas",
  modelId: "terco-efetivo",
  rows: {},
  params: {},
  motivos: {},
  indices: null
};

const $ = (s) => document.querySelector(s);
const el = {
  groupSelect: $("#groupSelect"), modelSelect: $("#modelSelect"), itemsHead: $("#itemsHead"), itemsBody: $("#itemsBody"),
  grandTotal: $("#grandTotal"), activeGroup: $("#activeGroup"), calcTitle: $("#calc-title"), modelNote: $("#modelNote"),
  modelParams: $("#modelParams"), addRow: $("#addRowButton"), reset: $("#resetButton"), alerts: $("#alerts"),
  subtotal: $("#subtotalValue"), corrigido: $("#corrigidoValue"), juros: $("#jurosValue"), total: $("#totalValue"),
  diferenca: $("#diferencaText"), motivos: $("#motivosList"), consLivre: $("#consideracaoLivre"), consPreview: $("#consideracaoPreview"),
  memoria: $("#memoriaBody"), pdf: $("#downloadPdfButton"), copy: $("#copyTableButton"), reqTag: $("#requisicaoTag"),
  processo: $("#processoInput"), processoHint: $("#processoHint"), exequente: $("#exequenteInput"), executado: $("#executadoInput"),
  citacao: $("#citacaoInput"), dataBase: $("#dataBaseInput"), valorExequente: $("#valorExequenteInput"), idExequente: $("#idExequenteInput"),
  upf: $("#upfInput"), indexStatus: $("#indexStatus"), fetchBcb: $("#fetchBcbButton"), importIndices: $("#importIndicesInput"),
  csvSerie: $("#csvSerieSelect"), csvInput: $("#csvInput")
};

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const pct = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const numFmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function num(v, fallback = 0) {
  if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
  const s = String(v ?? "").trim();
  if (!s) return fallback;
  const n = Number(s.includes(",") ? s.replace(/[R$\s.]/g, "").replace(",", ".") : s.replace(/[R$\s]/g, ""));
  return Number.isFinite(n) ? n : fallback;
}
function fmtMoney(v) { return Number.isFinite(v) ? money.format(v).replace(/ /g, " ") : "—"; }
function esc(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
function currentModel() { return MODELS.find((m) => m.id === state.modelId); }
function rowsOf(model) {
  if (!state.rows[model.id]) state.rows[model.id] = model.example.map((r) => ({ ...model.blank, ...r }));
  return state.rows[model.id];
}
function paramsOf(model) {
  if (!state.params[model.id]) state.params[model.id] = { ...(model.exampleParams || {}) };
  return state.params[model.id];
}
function storageGet(key) { try { return window.localStorage.getItem(key); } catch { return null; } }
function storageSet(key, value) { try { window.localStorage.setItem(key, value); return true; } catch { return false; } }

// ---------------------------------------------------------------- índices
function carregarIndices() {
  const embutido = window.CEPREC_INDICES || null;
  let local = null;
  try { local = JSON.parse(storageGet("ceprec.indices") || "null"); } catch { local = null; }
  const escolher = [embutido, local].filter((i) => i && i.series).sort((a, b) => String(b.atualizadoEm || "").localeCompare(String(a.atualizadoEm || "")));
  state.indices = escolher[0] || { series: {} };
  renderIndexStatus();
}

function renderIndexStatus() {
  const cob = E.cobertura(state.indices);
  const nomes = { ipcae: "IPCA-E", ipca: "IPCA", selic: "SELIC", poupancaJuros: "Juros poupança" };
  const partes = Object.entries(cob).map(([k, c]) => c ? `${nomes[k]} ${E.formatMonth(c.de)}–${E.formatMonth(c.ate)}` : `${nomes[k]}: não carregado`);
  const vazio = Object.values(cob).every((c) => !c);
  const origem = state.indices.fonte ? ` Fonte: ${state.indices.fonte}.` : "";
  const quando = state.indices.atualizadoEm ? ` Atualizada em ${E.formatDate(state.indices.atualizadoEm.slice(0, 10))}.` : "";
  el.indexStatus.className = "index-text" + (vazio ? " is-warning" : "");
  el.indexStatus.textContent = vazio
    ? "Nenhum índice carregado. A base de cálculo funciona, mas a atualização exige a tabela: use “Atualizar pelo Banco Central”, importe o arquivo gerado pelo script ou CSVs do SGS."
    : partes.join(" · ") + "." + origem + quando;
}

function salvarIndicesLocais(indices) {
  state.indices = indices;
  storageSet("ceprec.indices", JSON.stringify(indices));
  renderIndexStatus();
  renderAll();
}

async function buscarSgs(codigo, de, ate) {
  // A API do SGS limita consultas longas; busca em janelas de até 5 anos.
  const out = {};
  let ini = new Date(Date.UTC(de.getUTCFullYear(), de.getUTCMonth(), 1));
  const limite = new Date(Date.UTC(ate.getFullYear(), ate.getMonth(), ate.getDate()));
  while (ini <= limite) {
    const cinco = new Date(Date.UTC(ini.getUTCFullYear() + 5, ini.getUTCMonth(), 0));
    const fim = cinco < limite ? cinco : limite;
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${E.formatDate(ini)}&dataFinal=${E.formatDate(fim)}`;
    const resp = await fetch(url, { headers: { Accept: "application/json" } });
    if (!resp.ok) throw new Error(`SGS ${codigo}: HTTP ${resp.status}`);
    for (const d of await resp.json()) out[d.data] = Number(String(d.valor).replace(",", "."));
    ini = new Date(Date.UTC(fim.getUTCFullYear(), fim.getUTCMonth(), fim.getUTCDate() + 1));
  }
  return out;
}

function porMes(diario, primeiro = false) {
  const out = {};
  for (const [data, valor] of Object.entries(diario)) {
    const k = E.monthKey(data);
    if (!k) continue;
    if (primeiro) { if (!(k in out)) out[k] = valor; } else out[k] = valor;
  }
  return out;
}

async function atualizarPeloBcb() {
  el.fetchBcb.disabled = true;
  const original = el.fetchBcb.textContent;
  el.fetchBcb.textContent = "Consultando o Banco Central…";
  try {
    const hoje = new Date();
    const de2001 = new Date(Date.UTC(2001, 0, 1));
    const [ipcae, ipca, selic, meta] = await Promise.all([
      buscarSgs(10764, de2001, hoje), buscarSgs(433, new Date(Date.UTC(2025, 0, 1)), hoje),
      buscarSgs(4390, new Date(Date.UTC(2021, 0, 1)), hoje), buscarSgs(432, new Date(Date.UTC(2012, 4, 1)), hoje)
    ]);
    const metaMes = porMes(meta, true);
    const poupancaJuros = {};
    for (const k of E.monthRange("2009-07", E.monthKey(hoje))) poupancaJuros[k] = E.round2(E.jurosPoupancaMes(k, metaMes[k]) * 10000) / 10000;
    salvarIndicesLocais({
      fonte: "Banco Central do Brasil — SGS (10764, 433, 4390, 432)",
      atualizadoEm: new Date().toISOString(),
      series: { ipcae: porMes(ipcae), ipca: porMes(ipca), selic: porMes(selic), poupancaJuros }
    });
  } catch (err) {
    el.indexStatus.className = "index-text is-warning";
    el.indexStatus.textContent = `Não foi possível consultar o Banco Central diretamente deste navegador (${err.message}). Use o script scripts/atualizar-indices.mjs ou importe os CSVs do SGS.`;
  } finally {
    el.fetchBcb.disabled = false;
    el.fetchBcb.textContent = original;
  }
}

async function importarTabela(file) {
  const texto = await file.text();
  try {
    const ini = texto.indexOf("{"), fim = texto.lastIndexOf("}");
    if (ini < 0 || fim < ini) throw new Error("conteúdo JSON não encontrado");
    const dados = JSON.parse(texto.slice(ini, fim + 1));
    if (!dados.series) throw new Error("arquivo sem o campo series");
    salvarIndicesLocais({ ...dados, atualizadoEm: dados.atualizadoEm || new Date().toISOString() });
  } catch (err) {
    el.indexStatus.className = "index-text is-warning";
    el.indexStatus.textContent = `Arquivo de índices inválido: ${err.message}.`;
  }
}

async function importarCsv(file, serieNome) {
  const dados = E.parseSerieCsv(await file.text());
  if (!Object.keys(dados).length) {
    el.indexStatus.className = "index-text is-warning";
    el.indexStatus.textContent = "Nenhuma linha reconhecida no CSV. O formato esperado é o do SGS: data;valor (dd/mm/aaaa;0,52).";
    return;
  }
  const atual = JSON.parse(JSON.stringify(state.indices || { series: {} }));
  atual.series = atual.series || {};
  atual.series[serieNome] = { ...(atual.series[serieNome] || {}), ...dados };
  atual.fonte = "Importação manual (CSV do SGS)";
  atual.atualizadoEm = new Date().toISOString();
  salvarIndicesLocais(atual);
}

// ---------------------------------------------------------------- render
function renderSelectors() {
  el.groupSelect.innerHTML = GROUPS.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
  el.groupSelect.value = state.groupId;
  renderModelOptions();
}
function renderModelOptions() {
  const models = MODELS.filter((m) => m.group === state.groupId);
  if (!models.some((m) => m.id === state.modelId)) state.modelId = models[0].id;
  el.modelSelect.innerHTML = models.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
  el.modelSelect.value = state.modelId;
}

function inputCell(col, row, i) {
  const v = row[col.key];
  const base = `data-row="${i}" data-key="${col.key}"`;
  if (col.type === "date") return `<td class="editable-cell"><input class="cell-input" type="date" value="${esc(v)}" ${base} aria-label="${esc(col.label)} linha ${i + 1}"></td>`;
  if (col.type === "money") return `<td class="editable-cell"><input class="cell-input money-input" type="text" inputmode="decimal" value="${esc(v === 0 ? "" : numFmt.format(num(v)))}" placeholder="0,00" ${base} aria-label="${esc(col.label)} linha ${i + 1}"></td>`;
  if (col.type === "number") return `<td class="editable-cell"><input class="cell-input num-input" type="text" inputmode="decimal" value="${esc(v)}" ${base} aria-label="${esc(col.label)} linha ${i + 1}"></td>`;
  if (col.type === "check") return `<td class="editable-cell center"><input type="checkbox" ${v ? "checked" : ""} ${base} aria-label="${esc(col.label)} linha ${i + 1}"></td>`;
  return `<td class="editable-cell"><input class="cell-input" type="text" value="${esc(v)}" ${base} aria-label="${esc(col.label)} linha ${i + 1}"></td>`;
}

function renderTable(model, derivados) {
  el.itemsHead.innerHTML = `<tr>${model.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}<th class="th-action"><span class="sr-only">Remover</span></th></tr>`;
  const rows = rowsOf(model);
  el.itemsBody.innerHTML = rows.map((row, i) => {
    const d = derivados[i];
    const cells = model.columns.map((c) => {
      if (c.type === "calc") return `<td class="fixed-cell money">${fmtMoney(d[c.key])}</td>`;
      if (c.type === "calc-num") return `<td class="fixed-cell">${numFmt.format(d[c.key] || 0)}</td>`;
      if (c.type === "avos") {
        const manual = row.avos !== "" && row.avos !== undefined && row.avos !== null;
        return `<td class="editable-cell"><input class="cell-input num-input" type="text" inputmode="numeric" value="${esc(manual ? row.avos : "")}" placeholder="${d.avosAuto}" data-row="${i}" data-key="avos" aria-label="Avos linha ${i + 1}"><span class="row-note">${manual ? "informado" : "automático"}${d.avosMotivo ? " · " + esc(d.avosMotivo) : ""}</span></td>`;
      }
      return inputCell(c, row, i);
    }).join("");
    return `<tr class="${row.acordo ? "is-excluded" : ""}">${cells}<td class="row-remove"><button type="button" class="icon-button" data-remove="${i}" title="Remover linha" aria-label="Remover linha ${i + 1}">×</button></td></tr>`;
  }).join("");
}

function renderParams(model) {
  const params = paramsOf(model);
  el.modelParams.innerHTML = (model.params || []).map((p) => `
    <label class="field inline-field"><span>${esc(p.label)}</span>
      <input class="editable" type="${p.type === "date" ? "date" : "text"}" data-param="${p.key}" value="${esc(params[p.key] || "")}">
    </label>`).join("");
  el.modelParams.hidden = !(model.params || []).length;
}

function renderMotivos(model) {
  const marcados = state.motivos[model.id] || (state.motivos[model.id] = {});
  el.motivos.innerHTML = model.motivos.map((m, i) => `
    <label class="check"><input type="checkbox" data-motivo="${i}" ${marcados[i] ? "checked" : ""}> ${esc(m)}</label>`).join("");
}

function calcular() {
  const model = currentModel();
  const params = paramsOf(model);
  const rows = rowsOf(model);
  const derivados = rows.map((r) => model.derive(r, params));
  const citacao = el.citacao.value || null;
  const parcelas = derivados
    .map((d, i) => ({ descricao: rows[i].vinculo || rows[i].descricao || rows[i].periodo || rows[i].certidao || `Linha ${i + 1}`, valor: d.valor, termoCorrecao: d.termoCorrecao, termoJuros: model.usaCitacao === false ? d.termoJuros : citacao, excluida: rows[i].acordo }))
    .filter((p) => !p.excluida && p.valor > 0);
  const dataBase = el.dataBase.value;
  const resultado = E.atualizarParcelas(parcelas, dataBase, state.indices);
  return { model, rows, derivados, parcelas, resultado, dataBase, citacao };
}

function textoConsideracoes(model, calc) {
  const marcados = Object.entries(state.motivos[model.id] || {}).filter(([, v]) => v).map(([i]) => model.motivos[Number(i)]);
  const livre = el.consLivre.value.trim();
  const valorExeq = num(el.valorExequente.value, NaN);
  const total = calc.resultado.total;
  let frase = "";
  if (marcados.length || livre) {
    const id = el.idExequente.value.trim();
    frase = `A diferença entre este cálculo e o apresentado pela parte${id ? ` em id. ${id}` : ""} deu-se porque: ${[...marcados, ...(livre ? [livre] : [])].map((m, i) => `${i + 1}) ${m}`).join("; ")}.`;
  }
  if (Number.isFinite(valorExeq) && Number.isFinite(total)) {
    const dif = E.round2(valorExeq - total);
    if (dif !== 0) frase += `${frase ? " " : ""}Diferença de ${fmtMoney(Math.abs(dif))} a ${dif > 0 ? "MENOR" : "MAIOR"} que o da exequente.`;
  }
  return frase;
}

function renderResultado(calc) {
  const { model, resultado } = calc;
  el.subtotal.textContent = fmtMoney(resultado.principal);
  const ok = resultado.ok && resultado.itens.length > 0 && calc.dataBase;
  el.corrigido.textContent = ok ? fmtMoney(E.round2(resultado.total - resultado.juros)) : "—";
  el.juros.textContent = ok ? fmtMoney(resultado.juros) : "—";
  el.total.textContent = ok ? fmtMoney(resultado.total) : "—";
  el.grandTotal.textContent = ok ? fmtMoney(resultado.total) : fmtMoney(resultado.principal);
  el.grandTotal.closest(".total-card").classList.toggle("is-partial", !ok);

  const req = ok ? E.classificarRequisicao(resultado.total, num(el.upf.value, NaN)) : null;
  el.reqTag.hidden = !req;
  if (req) el.reqTag.textContent = `${req.tipo} · limite 100 UPF = ${fmtMoney(req.limite)}`;

  const valorExeq = num(el.valorExequente.value, NaN);
  if (ok && Number.isFinite(valorExeq)) {
    const dif = E.round2(valorExeq - resultado.total);
    el.diferenca.textContent = dif === 0 ? "Cálculo igual ao do exequente." : `Diferença de ${fmtMoney(Math.abs(dif))} a ${dif > 0 ? "MENOR" : "MAIOR"} que o da exequente (${fmtMoney(valorExeq)}).`;
    el.diferenca.className = "diferenca " + (dif > 0 ? "is-menor" : dif < 0 ? "is-maior" : "");
  } else {
    el.diferenca.textContent = "";
    el.diferenca.className = "diferenca";
  }
  el.consPreview.textContent = textoConsideracoes(model, calc);

  const alerts = [];
  if (!calc.dataBase) alerts.push({ t: "warn", m: "Informe a data-base do cálculo." });
  if (model.usaCitacao !== false && !calc.citacao) alerts.push({ t: "warn", m: "Informe a data da citação para os juros de mora." });
  for (const e of [...new Set(resultado.erros)]) alerts.push({ t: "error", m: e });
  for (const i of resultado.itens) for (const a of i.resultado.avisos) alerts.push({ t: "info", m: `${i.descricao}: ${a}` });
  for (const f of model.flags) alerts.push({ t: "info", m: f });
  const proc = el.processo.value.trim();
  if (proc && !E.validarCnj(proc)) alerts.push({ t: "warn", m: "Número do processo com dígito verificador inválido." });
  el.alerts.innerHTML = [...new Map(alerts.map((a) => [a.m, a])).values()].map((a) => `<p class="alert is-${a.t}">${esc(a.m)}</p>`).join("");

  el.memoria.innerHTML = resultado.itens.length ? resultado.itens.map((i) => {
    const r = i.resultado;
    const etapas = r.erro ? `<span class="error-text">${esc(r.erro)}</span>` : r.etapas.map((e) => `${esc(e.etapa)}: ${E.formatMonth(e.de)}–${E.formatMonth(e.ate)} · ${pct.format(e.indice)}%${e.detalhe ? ` (IPCA ${pct.format(e.detalhe.ipca)}%, juros ${pct.format(e.detalhe.juros)}%, SELIC ${pct.format(e.detalhe.selic)}%)` : ""}`).join("<br>") || "Sem atualização";
    return `<tr><td>${esc(i.descricao)}</td><td class="money">${fmtMoney(i.valor)}</td><td>${r.termoCorrecao ? E.formatMonth(r.termoCorrecao) : "—"}</td><td class="etapas">${etapas}</td><td class="money">${r.erro ? "—" : fmtMoney(r.valorFinal)}</td></tr>`;
  }).join("") : `<tr><td colspan="5" class="empty">Preencha a base de cálculo para ver a memória.</td></tr>`;
}

function renderAll() {
  const model = currentModel();
  el.activeGroup.textContent = GROUPS.find((g) => g.id === model.group).name;
  el.calcTitle.textContent = model.name;
  el.modelNote.textContent = model.note;
  renderParams(model);
  renderMotivos(model);
  const calc = calcular();
  renderTable(model, calc.derivados);
  renderResultado(calc);
}

function refreshResults() {
  // Atualiza valores calculados sem recriar os campos em edição.
  const calc = calcular();
  const model = calc.model;
  [...el.itemsBody.rows].forEach((tr, i) => {
    const d = calc.derivados[i];
    if (!d) return;
    let col = 0;
    for (const c of model.columns) {
      const td = tr.cells[col++];
      if (c.type === "calc") td.textContent = fmtMoney(d[c.key]);
      if (c.type === "calc-num") td.textContent = numFmt.format(d[c.key] || 0);
      if (c.type === "avos") {
        const input = td.querySelector("input");
        input.placeholder = d.avosAuto;
        const note = td.querySelector(".row-note");
        const manual = rowsOf(model)[i].avos !== "";
        note.textContent = `${manual ? "informado" : "automático"}${d.avosMotivo ? " · " + d.avosMotivo : ""}`;
      }
    }
    tr.classList.toggle("is-excluded", Boolean(rowsOf(model)[i].acordo));
  });
  renderResultado(calc);
}

// ---------------------------------------------------------------- eventos
function onCellInput(event) {
  const t = event.target;
  if (!t.dataset || t.dataset.row === undefined) return;
  const model = currentModel();
  const row = rowsOf(model)[Number(t.dataset.row)];
  const col = model.columns.find((c) => c.key === t.dataset.key);
  if (t.type === "checkbox") row[t.dataset.key] = t.checked;
  else if (col && (col.type === "money" || col.type === "number")) row[t.dataset.key] = t.value.trim() === "" ? 0 : num(t.value, row[t.dataset.key]);
  else if (t.dataset.key === "avos") row.avos = t.value.trim() === "" ? "" : num(t.value, "");
  else row[t.dataset.key] = t.value;
  refreshResults();
}

el.groupSelect.addEventListener("change", (e) => { state.groupId = e.target.value; renderModelOptions(); renderAll(); });
el.modelSelect.addEventListener("change", (e) => { state.modelId = e.target.value; renderAll(); });
el.itemsBody.addEventListener("input", onCellInput);
el.itemsBody.addEventListener("change", (e) => { if (e.target.type === "checkbox") onCellInput(e); });
el.itemsBody.addEventListener("click", (e) => {
  const b = e.target.closest("[data-remove]");
  if (!b) return;
  rowsOf(currentModel()).splice(Number(b.dataset.remove), 1);
  renderAll();
});
el.addRow.addEventListener("click", () => { const m = currentModel(); rowsOf(m).push({ ...m.blank }); renderAll(); });
el.reset.addEventListener("click", () => { const m = currentModel(); delete state.rows[m.id]; delete state.params[m.id]; renderAll(); });
el.modelParams.addEventListener("input", (e) => { const k = e.target.dataset.param; if (!k) return; paramsOf(currentModel())[k] = e.target.value; refreshResults(); });
el.motivos.addEventListener("change", (e) => { const i = e.target.dataset.motivo; if (i === undefined) return; state.motivos[state.modelId][i] = e.target.checked; refreshResults(); });
for (const input of [el.citacao, el.dataBase, el.valorExequente, el.idExequente, el.upf, el.consLivre, el.processo, el.exequente]) input.addEventListener("input", () => {
  if (input === el.processo) {
    const v = el.processo.value.trim();
    el.processoHint.textContent = v ? (E.validarCnj(v) ? "Número válido." : "Dígito verificador não confere.") : "";
    el.processoHint.className = "hint " + (v ? (E.validarCnj(v) ? "is-ok" : "is-bad") : "");
  }
  if (input === el.upf) storageSet("ceprec.upf", el.upf.value);
  refreshResults();
});
el.processo.addEventListener("blur", () => { if (E.validarCnj(el.processo.value)) el.processo.value = E.formatarCnj(el.processo.value); });
el.fetchBcb.addEventListener("click", atualizarPeloBcb);
el.importIndices.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importarTabela(f); e.target.value = ""; });
el.csvInput.addEventListener("change", (e) => { const f = e.target.files[0]; if (f) importarCsv(f, el.csvSerie.value); e.target.value = ""; });
el.copy.addEventListener("click", copiarTabela);
el.pdf.addEventListener("click", gerarPdf);

// ---------------------------------------------------------------- copiar
function linhasExportacao(calc) {
  const { model, rows, derivados } = calc;
  const headers = model.columns.map((c) => c.label);
  const linhas = rows.map((r, i) => model.columns.map((c) => {
    const d = derivados[i];
    if (c.type === "calc") return fmtMoney(d[c.key]);
    if (c.type === "calc-num") return numFmt.format(d[c.key] || 0);
    if (c.type === "avos") return String(d.avosUsado);
    if (c.type === "money") return fmtMoney(num(r[c.key]));
    if (c.type === "date") return E.formatDate(r[c.key]);
    if (c.type === "check") return r[c.key] ? "Sim" : "Não";
    return String(r[c.key] ?? "");
  }));
  return { headers, linhas };
}

async function copiarTabela() {
  const calc = calcular();
  const { headers, linhas } = linhasExportacao(calc);
  const r = calc.resultado;
  const resumo = [["SUBTOTAL", fmtMoney(r.principal)], ["CORREÇÃO E ATUALIZAÇÃO", r.ok ? fmtMoney(E.round2(r.total - r.juros)) : "—"], ["JUROS", r.ok ? fmtMoney(r.juros) : "—"], ["TOTAL", r.ok ? fmtMoney(r.total) : "—"]];
  const th = (h) => `<th style="border:1px solid #d6e1ed;background:#232c77;color:#fff;padding:6px;text-align:left;">${esc(h)}</th>`;
  const td = (v) => `<td style="border:1px solid #d6e1ed;padding:6px;">${esc(v)}</td>`;
  const html = `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:10pt;"><thead><tr>${headers.map(th).join("")}</tr></thead><tbody>${linhas.map((l) => `<tr>${l.map(td).join("")}</tr>`).join("")}${resumo.map(([a, b]) => `<tr><td colspan="${headers.length - 1}" style="border:1px solid #d6e1ed;padding:6px;font-weight:bold;background:#fff6cc;">${a}</td>${td(b)}</tr>`).join("")}</tbody></table>`;
  const text = [headers, ...linhas, ...resumo].map((l) => l.join("\t")).join("\n");
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([text], { type: "text/plain" }) })]);
    } else {
      await navigator.clipboard.writeText(text);
    }
    flash(el.copy, "✓");
  } catch {
    flash(el.copy, "!");
  }
}
function flash(btn, s) { const o = btn.textContent; btn.textContent = s; setTimeout(() => { btn.textContent = o; }, 1400); }

// ---------------------------------------------------------------- PDF
async function imagemDataUrl(url) {
  const blob = await (await fetch(url)).blob();
  return await new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = err; r.readAsDataURL(blob); });
}

async function gerarPdf() {
  const calc = calcular();
  const { model, resultado } = calc;
  if (!window.jspdf?.jsPDF) { el.alerts.insertAdjacentHTML("afterbegin", `<p class="alert is-error">Gerador de PDF indisponível: confira se a pasta vendor foi publicada.</p>`); return; }
  el.pdf.disabled = true; el.pdf.textContent = "Gerando PDF…";
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const brand = window.CEPREC_BRANDBAR || await imagemDataUrl("assets/ceprec-brandbar.png").catch(() => null);
    const P = { w: 210, m: 14, bottom: 280 };
    const C = { ink: [24, 36, 52], muted: [82, 104, 122], primary: [35, 44, 119], line: [214, 225, 237], yellow: [255, 246, 204] };
    let y = 0;
    const header = () => {
      if (brand) doc.addImage(brand, brand.startsWith("data:image/jpeg") ? "JPEG" : "PNG", 0, 0, P.w, 25.2);
      else { doc.setFillColor(...C.primary); doc.rect(0, 0, P.w, 25.2, "F"); }
      y = 33;
      doc.setTextColor(...C.ink); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      ["ESTADO DE MATO GROSSO", "PROCURADORIA-GERAL DO ESTADO", "SUBPROCURADORIA-GERAL JUDICIAL", "COORDENADORIA DE EXECUÇÃO E PRECATÓRIOS"].forEach((t) => { doc.text(t, P.w / 2, y, { align: "center" }); y += 4.2; });
      y += 3;
    };
    const space = (h) => { if (y + h > P.bottom) { doc.addPage(); header(); } };
    const faixa = (t) => { space(10); doc.setFillColor(...C.primary); doc.rect(P.m, y, P.w - 2 * P.m, 7, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(t, P.m + 2, y + 4.8); y += 9; };
    const linhaTotal = (rotulo, valor, destaque) => {
      space(8);
      if (destaque) { doc.setFillColor(...C.yellow); doc.rect(P.m, y, P.w - 2 * P.m, 7, "F"); }
      doc.setDrawColor(...C.line); doc.rect(P.m, y, P.w - 2 * P.m, 7);
      doc.setTextColor(...C.ink); doc.setFont("helvetica", destaque ? "bold" : "normal"); doc.setFontSize(9);
      doc.text(rotulo, P.m + 2, y + 4.8); doc.text(valor, P.w - P.m - 2, y + 4.8, { align: "right" }); y += 7;
    };
    header();
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...C.ink);
    const proc = el.processo.value.trim();
    [["PROCESSO:", proc ? E.formatarCnj(proc) : "—"], ["EXEQUENTE:", el.exequente.value.trim() || "—"], ["EXECUTADO:", (el.executado.value || "Estado de Mato Grosso").toUpperCase()], ["MODELO:", model.name], ["DATA-BASE:", calc.dataBase ? E.formatDate(calc.dataBase) : "—"], ...(calc.citacao && model.usaCitacao !== false ? [["CITAÇÃO:", E.formatDate(calc.citacao)]] : [])]
      .forEach(([a, b]) => { doc.setFont("helvetica", "bold"); doc.text(a, P.m, y); doc.setFont("helvetica", "normal"); doc.text(doc.splitTextToSize(b, 150), P.m + 26, y); y += 5; });
    y += 2;
    faixa("BASE DE CÁLCULO");
    const { headers, linhas } = linhasExportacao(calc);
    const largura = (P.w - 2 * P.m) / headers.length;
    doc.setFillColor(238, 244, 251); doc.rect(P.m, y, P.w - 2 * P.m, 8, "F");
    doc.setTextColor(...C.primary); doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
    headers.forEach((h, i) => doc.text(doc.splitTextToSize(h, largura - 2), P.m + i * largura + 1, y + 3.5));
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...C.ink);
    for (const l of linhas) {
      const alt = Math.max(7, ...l.map((v) => doc.splitTextToSize(v, largura - 2).length * 3.6 + 3));
      space(alt);
      doc.setDrawColor(...C.line); doc.rect(P.m, y, P.w - 2 * P.m, alt);
      l.forEach((v, i) => doc.text(doc.splitTextToSize(v, largura - 2), P.m + i * largura + 1, y + 4.5));
      y += alt;
    }
    linhaTotal("SUBTOTAL", fmtMoney(resultado.principal), true);
    y += 3;
    faixa("CORREÇÃO E ATUALIZAÇÃO");
    const ok = resultado.ok && calc.dataBase;
    linhaTotal("CORREÇÃO IPCA-E ATÉ 11/2021, SELIC (EC 113/2021) E IPCA + 2% a.a. (EC 136/2025)", ok ? fmtMoney(E.round2(resultado.total - resultado.juros)) : "não apurado");
    linhaTotal("JUROS DE MORA ATÉ 11/2021 (1% / 0,5% / POUPANÇA)", ok ? fmtMoney(resultado.juros) : "não apurado");
    linhaTotal("TOTAL", ok ? fmtMoney(resultado.total) : "não apurado", true);
    const req = ok ? E.classificarRequisicao(resultado.total, num(el.upf.value, NaN)) : null;
    if (req) { y += 2; doc.setFontSize(8.5); doc.setTextColor(...C.muted); doc.text(`Enquadramento: ${req.tipo} (limite de 100 UPF/MT = ${fmtMoney(req.limite)}).`, P.m, y + 3); y += 6; }
    const cons = textoConsideracoes(model, calc);
    if (cons) {
      y += 3; faixa("CONSIDERAÇÕES");
      doc.setTextColor(...C.ink); doc.setFont("helvetica", "normal"); doc.setFontSize(9);
      const t = doc.splitTextToSize(cons, P.w - 2 * P.m); space(t.length * 4.5); doc.text(t, P.m, y + 3); y += t.length * 4.5 + 3;
    }
    // memória
    doc.addPage(); header(); faixa("MEMÓRIA DE CÁLCULO POR PARCELA");
    doc.setFontSize(8);
    for (const i of resultado.itens) {
      const r = i.resultado;
      const txt = [`${i.descricao} — base ${fmtMoney(i.valor)} — termo inicial ${r.termoCorrecao ? E.formatMonth(r.termoCorrecao) : "—"}`,
        ...(r.erro ? [r.erro] : r.etapas.map((e) => `   ${e.etapa}: ${E.formatMonth(e.de)} a ${E.formatMonth(e.ate)} · ${pct.format(e.indice)}%${e.detalhe ? ` (IPCA ${pct.format(e.detalhe.ipca)}%, juros ${pct.format(e.detalhe.juros)}%, SELIC ${pct.format(e.detalhe.selic)}%)` : ""} = ${fmtMoney(e.valorApos)}`)),
        `   Valor atualizado: ${r.erro ? "não apurado" : fmtMoney(r.valorFinal)}`];
      const linhasTxt = txt.flatMap((t) => doc.splitTextToSize(t, P.w - 2 * P.m));
      space(linhasTxt.length * 3.8 + 2);
      doc.setTextColor(...C.ink); doc.text(linhasTxt, P.m, y + 3); y += linhasTxt.length * 3.8 + 2;
    }
    y += 4;
    doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.setFont("helvetica", "italic");
    const crit = doc.splitTextToSize(`Critérios: correção pelo IPCA-E até 11/2021; juros de mora simples de 1% a.m. até 07/2001, 0,5% a.m. de 08/2001 a 06/2009 e juros da poupança de 07/2009 a 11/2021; SELIC de 12/2021 a 08/2025 (EC 113/2021), em soma simples, uma única vez; a partir de 09/2025, IPCA e juros simples de 2% a.a., limitados à SELIC (EC 136/2025). Índices do mês do termo inicial ao mês anterior à data-base. Fonte dos índices: ${state.indices.fonte || "tabela carregada"}.`, P.w - 2 * P.m);
    space(crit.length * 3.5); doc.text(crit, P.m, y);
    const n = doc.getNumberOfPages();
    for (let p = 1; p <= n; p++) { doc.setPage(p); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...C.muted); doc.text(`Página ${p} de ${n}`, P.w - P.m, 290, { align: "right" }); doc.text("Calculadora da Contadoria — CEPREC/PGE-MT", P.m, 290); }
    const nome = `calculo-ceprec-${(proc || model.id).replace(/\D+/g, "") || model.id}.pdf`;
    doc.save(nome);
  } finally {
    el.pdf.disabled = false; el.pdf.textContent = "Gerar demonstrativo PDF";
  }
}

// ---------------------------------------------------------------- importação do SPA (extensão CEPREC)
/**
 * A extensão CEPREC abre a calculadora com "#ceprec=..." (dados do processo lidos no SPA).
 * Preenche só os campos recebidos, destaca-os e apaga o fragmento do endereço.
 */
function aplicarImportacaoSpa() {
  const I = window.CeprecImportSpa;
  if (!I) return;
  const d = I.lerFragmento(window.location.hash);
  if (!d) return;
  try { window.history.replaceState(null, "", window.location.pathname + window.location.search); } catch { /* sem histórico */ }
  const aviso = document.querySelector("#importacaoSpa");
  if (d.erro) { if (aviso) { aviso.hidden = false; aviso.className = "import-banner is-bad"; aviso.textContent = d.erro; } return; }
  if (d.modelo) {
    const m = MODELS.find((x) => x.id === d.modelo);
    if (m) { state.groupId = m.group; state.modelId = m.id; renderSelectors(); }
  }
  const marcar = (input) => { input.classList.add("importado"); input.title = "Importado do SPA pela extensão CEPREC — conferir"; };
  if (d.processo) { el.processo.value = E.validarCnj(d.processo) ? E.formatarCnj(d.processo) : d.processo; marcar(el.processo); }
  if (d.exequente) { el.exequente.value = d.exequente; marcar(el.exequente); }
  if (d.citacao) { el.citacao.value = d.citacao; marcar(el.citacao); }
  if (d.valorExequente !== null) { el.valorExequente.value = fmtMoney(d.valorExequente); marcar(el.valorExequente); }
  if (d.idExequente) { el.idExequente.value = d.idExequente; marcar(el.idExequente); }
  if (d.upf !== null && !el.upf.value) { el.upf.value = numFmt.format(d.upf); storageSet("ceprec.upf", el.upf.value); marcar(el.upf); }
  el.processo.dispatchEvent(new Event("input"));
  renderAll();
  const itens = I.resumo(d);
  if (aviso) {
    aviso.hidden = false;
    aviso.className = "import-banner";
    aviso.textContent = itens.length
      ? `Dados importados do SPA pela extensão CEPREC: ${itens.join(", ")}. Confira os campos destacados antes de gerar o demonstrativo.`
      : "A extensão abriu a calculadora, mas nenhum dado do processo foi reconhecido no SPA.";
  }
}

// ---------------------------------------------------------------- início
(function iniciar() {
  const hoje = new Date();
  el.dataBase.value = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  el.upf.value = storageGet("ceprec.upf") || "";
  carregarIndices();
  renderSelectors();
  renderAll();
  aplicarImportacaoSpa();
  window.addEventListener("hashchange", aplicarImportacaoSpa);
})();
