/**
 * Caça o erro que o `tsc` não pega: variável lida antes de existir.
 *
 * O caso que derrubou a tela de O.S. em produção:
 *
 *     const equipe = (lista ?? []).find((e) => e.id === form.equipeId);
 *     ...
 *     const [form, setForm] = useState(VAZIO);
 *
 * O `.find` roda no mesmo instante em que a linha é avaliada, e `form` só
 * existe umas linhas abaixo — "Cannot access 'form' before initialization",
 * tela branca. Para o compilador está tudo certo: a referência está dentro de
 * uma função, e ele não sabe que essa função é chamada ali mesmo.
 *
 * A verificação é de propósito estreita, para não virar ruído: só olha funções
 * passadas como argumento para chamadas que acontecem durante a avaliação do
 * próprio escopo — `find`, `map`, `filter` e afins. Handler de clique que usa
 * variável declarada mais abaixo continua válido, porque só roda depois.
 *
 * Roda com `node scripts/checar-uso-antes-da-declaracao.mjs`.
 */
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const RAIZES = ["client/src", "server", "shared"];

/** Métodos que executam a função recebida na hora. */
const CHAMADAS_IMEDIATAS = new Set([
  "find",
  "findIndex",
  "filter",
  "map",
  "some",
  "every",
  "reduce",
  "forEach",
  "flatMap",
  "sort",
]);

function arquivos(dir) {
  const achados = [];
  if (!fs.existsSync(dir)) return achados;

  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const caminho = path.join(dir, item.name);
    if (item.isDirectory()) achados.push(...arquivos(caminho));
    else if (/\.(ts|tsx)$/.test(item.name) && !item.name.endsWith(".d.ts")) achados.push(caminho);
  }
  return achados;
}

/** As declarações `const`/`let` do corpo de uma função ou de um bloco. */
function declaracoesDo(corpo) {
  const mapa = new Map();
  for (const linha of corpo.statements ?? []) {
    if (!ts.isVariableStatement(linha)) continue;
    const lista = linha.declarationList;
    // `var` sobe para o topo do escopo: não estoura, e não é o caso aqui.
    if (!(lista.flags & (ts.NodeFlags.Const | ts.NodeFlags.Let))) continue;

    for (const decl of lista.declarations) {
      for (const nome of nomesDe(decl.name)) mapa.set(nome, decl.getStart());
    }
  }
  return mapa;
}

/** Nomes declarados, inclusive os que vêm de desestruturação. */
function nomesDe(alvo) {
  if (ts.isIdentifier(alvo)) return [alvo.text];

  const nomes = [];
  if (ts.isArrayBindingPattern(alvo) || ts.isObjectBindingPattern(alvo)) {
    for (const elemento of alvo.elements) {
      if (ts.isBindingElement(elemento)) nomes.push(...nomesDe(elemento.name));
    }
  }
  return nomes;
}

function analisar(arquivo) {
  const texto = fs.readFileSync(arquivo, "utf8");
  const fonte = ts.createSourceFile(arquivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const problemas = [];

  const visitarCorpo = (corpo) => {
    const declaradas = declaracoesDo(corpo);
    if (declaradas.size === 0) return;

    const procurar = (no) => {
      // Chamada tipo `algo.find(cb)` feita no corpo deste escopo: o `cb` roda
      // agora, então tudo que ele lê já precisa existir.
      if (
        ts.isCallExpression(no) &&
        ts.isPropertyAccessExpression(no.expression) &&
        CHAMADAS_IMEDIATAS.has(no.expression.name.text)
      ) {
        for (const argumento of no.arguments) {
          if (!ts.isArrowFunction(argumento) && !ts.isFunctionExpression(argumento)) continue;

          const olharDentro = (dentro) => {
            if (ts.isIdentifier(dentro)) {
              const declaradaEm = declaradas.get(dentro.text);

              // Nome não é referência: `obj.unidades`, `{ unidades: x }` e
              // `{ unidades: y } = z` só coincidem no texto. Sem esta parte a
              // checagem acusa código correto e ninguém confia nela.
              const pai = dentro.parent;
              const ehNome =
                (ts.isPropertyAccessExpression(pai) && pai.name === dentro) ||
                (ts.isPropertyAssignment(pai) && pai.name === dentro) ||
                (ts.isBindingElement(pai) && pai.propertyName === dentro) ||
                (ts.isPropertySignature(pai) && pai.name === dentro) ||
                (ts.isMethodDeclaration(pai) && pai.name === dentro);

              if (declaradaEm !== undefined && !ehNome && dentro.getStart() < declaradaEm) {
                const { line } = fonte.getLineAndCharacterOfPosition(dentro.getStart());
                problemas.push({ arquivo, linha: line + 1, nome: dentro.text });
              }
            }
            ts.forEachChild(dentro, olharDentro);
          };

          ts.forEachChild(argumento, olharDentro);
        }
      }

      // Não entra em funções: o que está lá dentro roda depois, quando tudo
      // já existe — é o falso positivo que tornaria esta checagem inútil.
      if (
        ts.isArrowFunction(no) ||
        ts.isFunctionExpression(no) ||
        ts.isFunctionDeclaration(no) ||
        ts.isMethodDeclaration(no)
      ) {
        return;
      }

      ts.forEachChild(no, procurar);
    };

    for (const linha of corpo.statements ?? []) procurar(linha);
  };

  const andar = (no) => {
    if (
      (ts.isFunctionDeclaration(no) ||
        ts.isArrowFunction(no) ||
        ts.isFunctionExpression(no) ||
        ts.isMethodDeclaration(no)) &&
      no.body &&
      ts.isBlock(no.body)
    ) {
      visitarCorpo(no.body);
    }
    ts.forEachChild(no, andar);
  };

  visitarCorpo(fonte);
  andar(fonte);

  return problemas;
}

const encontrados = RAIZES.flatMap((raiz) => arquivos(raiz)).flatMap(analisar);

if (encontrados.length === 0) {
  console.log("[uso-antes-da-declaracao] nada encontrado.");
  process.exit(0);
}

for (const p of encontrados) {
  console.error(`${p.arquivo}:${p.linha}  "${p.nome}" é lido antes de ser declarado.`);
}
console.error(
  `\n${encontrados.length} ocorrência(s). Isso quebra a tela em produção sem o \`tsc\` reclamar: ` +
    `mova a declaração para antes do uso.`,
);
process.exit(1);
