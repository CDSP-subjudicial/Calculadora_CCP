/*
 * Importação dos dados do processo enviados pela extensão CEPREC (lidos no SPA).
 * A extensão abre a calculadora com "#ceprec=<base64url(JSON)>". O fragmento não vai a servidor
 * nenhum; a calculadora lê, preenche os campos e apaga o fragmento do endereço.
 * Funções puras, sem DOM: window.CeprecImportSpa no navegador e module.exports nos testes.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.CeprecImportSpa = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MODELOS_ACEITOS = ["terco-efetivo", "terco-temporario", "licenca-premio", "certidao-credito",
    "honorarios-fixos", "honorarios-percentuais", "parcelas"];

  function fromBase64Url(s) {
    const b64 = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const bin = typeof atob === "function" ? atob(b64 + pad) : Buffer.from(b64 + pad, "base64").toString("binary");
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }

  const texto = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max || 200);
  const dataIso = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
  const numero = (v) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 1e12 ? Math.round(v * 100) / 100 : null);

  /**
   * Lê o fragmento (#ceprec=...) e devolve os dados saneados, ou null se não houver importação.
   * Nunca lança erro: dado malformado volta como { erro }.
   */
  function lerFragmento(hash) {
    const m = String(hash || "").match(/(?:^#|[#&])ceprec=([A-Za-z0-9_-]+)/);
    if (!m) return null;
    let bruto;
    try { bruto = JSON.parse(fromBase64Url(m[1])); } catch (e) { return { erro: "Os dados enviados pela extensão não puderam ser lidos." }; }
    if (!bruto || typeof bruto !== "object") return { erro: "Os dados enviados pela extensão não puderam ser lidos." };
    const modelo = MODELOS_ACEITOS.indexOf(bruto.modelo) >= 0 ? bruto.modelo : "";
    return {
      processo: texto(bruto.processo, 30),
      exequente: texto(bruto.exequente, 150),
      citacao: dataIso(bruto.citacao),
      valorExequente: numero(bruto.valorExequente),
      idExequente: texto(bruto.idExequente, 40),
      modelo,
      upf: numero(bruto.upf)
    };
  }

  /** Lista legível do que foi importado (para o aviso na tela). */
  function resumo(d) {
    if (!d || d.erro) return [];
    const r = [];
    if (d.processo) r.push("processo");
    if (d.exequente) r.push("exequente");
    if (d.citacao) r.push("data da citação");
    if (d.valorExequente !== null) r.push("valor do exequente");
    if (d.idExequente) r.push("Id. do cálculo do exequente");
    if (d.modelo) r.push("modelo sugerido");
    if (d.upf !== null) r.push("UPF/MT");
    return r;
  }

  return Object.freeze({ lerFragmento, resumo, fromBase64Url, MODELOS_ACEITOS });
});
