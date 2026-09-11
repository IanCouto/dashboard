import assert from "node:assert/strict";
import { findHeaderRowIndex } from "../lib/excel";

const workingStyle = [
  ["", "", "R$ 1,066,829", "R$ 1,034,980"],
  ["", "Região", "Promotor", "Tipo contrato", "Coordenador ", "Ano", "Janeiro", "Dezembro"],
  ["", "FAREG02", "Antônio", "Compartilhado", "Leonardo", "2025", "100", "166"],
];

const brokenStyle = [
  ["Região", "Promotor", "Tipo contrato", "Coordenador ", "Ano", "Janeiro", "Dezembro"],
  ["FAREG02", "Antônio", "Compartilhado", "Leonardo/Pablo", "2025", "219611", "176581"],
];

assert.equal(findHeaderRowIndex(workingStyle), 1);
assert.equal(findHeaderRowIndex(brokenStyle), 0);

try {
  findHeaderRowIndex([["totais"], ["FAREG02", "2025"]]);
  assert.fail("should throw when headers are missing");
} catch (error) {
  assert.equal(
    error instanceof Error && error.message,
    "Nenhum cabecalho encontrado nas primeiras linhas da planilha."
  );
}

console.log("ok");
