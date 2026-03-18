/**
 * Zero-dependency syntax highlighter for code blocks.
 * Covers JS/TS, bash, JSON, SQL, CSS, Python, Go, Rust.
 * Returns HTML with <span class="hl-*"> tokens.
 */

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string) => s.replace(/[&<>"]/g, c => ESC[c] || c);

const span = (cls: string, text: string) => `<span class="hl-${cls}">${esc(text)}</span>`;

const JS_KW = new Set(["const","let","var","function","return","if","else","for","while","do","switch","case","break","continue","new","delete","typeof","instanceof","void","in","of","class","extends","super","import","export","from","default","async","await","yield","try","catch","finally","throw","this","true","false","null","undefined","type","interface","enum","as","is","declare","readonly","abstract","implements","namespace","module","keyof","infer","satisfies","using"]);
const PY_KW = new Set(["def","class","return","if","elif","else","for","while","import","from","as","try","except","finally","raise","with","yield","lambda","pass","break","continue","and","or","not","in","is","True","False","None","self","async","await","print","nonlocal","global","assert","del"]);
const SH_KW = new Set(["if","then","else","elif","fi","for","while","do","done","case","esac","in","function","return","exit","echo","cd","ls","rm","cp","mv","mkdir","cat","grep","sed","awk","find","xargs","export","source","sudo","chmod","chown","curl","wget","git","bun","npm","npx","node","docker","kill","ps","env","set","unset","test","read","eval","exec","trap","shift","local","declare","readonly"]);
const SQL_KW = new Set(["SELECT","FROM","WHERE","INSERT","INTO","VALUES","UPDATE","SET","DELETE","CREATE","DROP","ALTER","TABLE","INDEX","JOIN","LEFT","RIGHT","INNER","OUTER","ON","AND","OR","NOT","NULL","IS","AS","ORDER","BY","GROUP","HAVING","LIMIT","OFFSET","DISTINCT","COUNT","SUM","AVG","MIN","MAX","CASE","WHEN","THEN","ELSE","END","EXISTS","IN","BETWEEN","LIKE","UNION","ALL","PRIMARY","KEY","DEFAULT","INTEGER","TEXT","REAL","BLOB","VIRTUAL","USING","IF","REPLACE","COALESCE","CAST","ROUND","SUBSTR","PRAGMA"]);
const CSS_KW = new Set(["margin","padding","border","background","color","font","display","position","top","left","right","bottom","width","height","flex","grid","align","justify","overflow","opacity","transition","transform","animation","cursor","z-index","box-sizing","content","gap","outline","text","line-height","max-width","min-width","max-height","min-height"]);
const GO_KW = new Set(["func","package","import","return","if","else","for","range","switch","case","default","break","continue","go","defer","select","chan","map","struct","interface","type","var","const","nil","true","false","make","append","len","cap","new","error","string","int","bool","byte","float64","int64","uint"]);
const RUST_KW = new Set(["fn","let","mut","const","if","else","for","while","loop","match","return","struct","enum","impl","trait","use","mod","pub","self","super","crate","where","async","await","move","ref","type","static","unsafe","extern","dyn","true","false","as","in","break","continue","Some","None","Ok","Err","Self","String","Vec","Box","Option","Result","println","eprintln","format","i32","u32","i64","u64","f64","usize","bool","str"]);

type Tokenizer = (code: string) => string;

function tokenizeJS(code: string): string {
  return code.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_$][\w$]*\b)|(=>|\.{3}|\?\.|&&|\|\||[!=]==?|[<>]=?|\+\+|--|\?\?)/g,
    (m, comment, str, num, word, op) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (num) return span("number", num);
      if (word) return JS_KW.has(word) ? span("keyword", word) : esc(word);
      if (op) return span("operator", op);
      return esc(m);
    });
}

function tokenizePython(code: string): string {
  return code.replace(/(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|"""[\s\S]*?"""|'''[\s\S]*?''')|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_]\w*\b)|(->|:=|[!=]=|[<>]=?|\*\*)/g,
    (m, comment, str, num, word, op) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (num) return span("number", num);
      if (word) return PY_KW.has(word) ? span("keyword", word) : esc(word);
      if (op) return span("operator", op);
      return esc(m);
    });
}

function tokenizeBash(code: string): string {
  return code.replace(/(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(\$\{?\w+\}?|\$\([^)]*\))|(\b\d+\b)|(\b[a-zA-Z_][\w.-]*\b)|(&&|\|\||[|><]=?|;;)/g,
    (m, comment, str, variable, num, word, op) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (variable) return span("variable", variable);
      if (num) return span("number", num);
      if (word) return SH_KW.has(word) ? span("keyword", word) : esc(word);
      if (op) return span("operator", op);
      return esc(m);
    });
}

function tokenizeSQL(code: string): string {
  return code.replace(/(--[^\n]*)|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_]\w*\b)/g,
    (m, comment, str, num, word) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (num) return span("number", num);
      if (word) return SQL_KW.has(word.toUpperCase()) ? span("keyword", word) : esc(word);
      return esc(m);
    });
}

function tokenizeJSON(code: string): string {
  return code.replace(/("(?:[^"\\]|\\.)*")\s*(:)|("(?:[^"\\]|\\.)*")|(\b(?:true|false|null)\b)|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)/g,
    (m, key, colon, str, kw, num) => {
      if (key) return span("key", key) + esc(colon);
      if (str) return span("string", str);
      if (kw) return span("keyword", kw);
      if (num) return span("number", num);
      return esc(m);
    });
}

function tokenizeCSS(code: string): string {
  return code.replace(/(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\.\w[\w-]*|#\w[\w-]*)|([\w-]+)\s*(?=:)|(-?\d+(?:\.\d+)?(?:px|em|rem|vh|vw|%|s|ms|deg|fr)?)|(@\w+)/g,
    (m, comment, str, selector, prop, num, at) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (selector) return span("selector", selector);
      if (prop && CSS_KW.has(prop.split("-")[0])) return span("property", prop);
      if (num) return span("number", num);
      if (at) return span("keyword", at);
      return esc(m);
    });
}

function tokenizeGo(code: string): string {
  return code.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|`[^`]*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\b[a-zA-Z_]\w*\b)|(:=|<-|&&|\|\||[!=]=|[<>]=?)/g,
    (m, comment, str, num, word, op) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (num) return span("number", num);
      if (word) return GO_KW.has(word) ? span("keyword", word) : esc(word);
      if (op) return span("operator", op);
      return esc(m);
    });
}

function tokenizeRust(code: string): string {
  return code.replace(/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|(\b\d+(?:\.\d+)?(?:_\d+)*(?:u\d+|i\d+|f\d+|usize|isize)?\b)|(\b[a-zA-Z_]\w*!?)|(&mut|->|=>|::|&&|\|\||[!=]=|[<>]=?)/g,
    (m, comment, str, num, word, op) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (num) return span("number", num);
      if (word) { const w = word.replace(/!$/, ""); return RUST_KW.has(w) ? span("keyword", word) : esc(word); }
      if (op) return span("operator", op);
      return esc(m);
    });
}

function tokenizeDiff(code: string): string {
  return code.split("\n").map(line => {
    if (line.startsWith("+++") || line.startsWith("---")) return span("meta", line);
    if (line.startsWith("@@")) return span("meta", line);
    if (line.startsWith("+")) return span("inserted", line);
    if (line.startsWith("-")) return span("deleted", line);
    return esc(line);
  }).join("\n");
}

function tokenizeYaml(code: string): string {
  return code.replace(/(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(\b(?:true|false|null|yes|no)\b)|(-?\b\d+(?:\.\d+)?\b)|([\w.-]+)\s*(?=:)/g,
    (m, comment, str, kw, num, key) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (kw) return span("keyword", kw);
      if (num) return span("number", num);
      if (key) return span("key", key);
      return esc(m);
    });
}

function tokenizeToml(code: string): string {
  return code.replace(/(#[^\n]*)|("(?:[^"\\]|\\.)*"|'[^']*')|(\b(?:true|false)\b)|(-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\[[\w.-]+\])|([\w.-]+)\s*(?==)/g,
    (m, comment, str, kw, num, section, key) => {
      if (comment) return span("comment", comment);
      if (str) return span("string", str);
      if (kw) return span("keyword", kw);
      if (num) return span("number", num);
      if (section) return span("keyword", section);
      if (key) return span("key", key);
      return esc(m);
    });
}

const LANG_MAP: Record<string, Tokenizer> = {
  js: tokenizeJS, javascript: tokenizeJS, jsx: tokenizeJS,
  ts: tokenizeJS, typescript: tokenizeJS, tsx: tokenizeJS,
  py: tokenizePython, python: tokenizePython,
  sh: tokenizeBash, bash: tokenizeBash, shell: tokenizeBash, zsh: tokenizeBash, terminal: tokenizeBash,
  sql: tokenizeSQL, sqlite: tokenizeSQL,
  json: tokenizeJSON, jsonc: tokenizeJSON,
  css: tokenizeCSS, scss: tokenizeCSS,
  go: tokenizeGo, golang: tokenizeGo,
  rs: tokenizeRust, rust: tokenizeRust,
  diff: tokenizeDiff, patch: tokenizeDiff,
  yaml: tokenizeYaml, yml: tokenizeYaml,
  toml: tokenizeToml, ini: tokenizeToml,
};

export function highlight(code: string, language: string): string {
  const tokenizer = LANG_MAP[language.toLowerCase()];
  return tokenizer ? tokenizer(code) : esc(code);
}
