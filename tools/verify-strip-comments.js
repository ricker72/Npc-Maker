



'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');



const { stripComments } = require('./strip-comments.js');

const casos = [
  ['URL dentro de cadena', 'const a = "https://ejemplo.com/x"; // fuera', 'const a = "https://ejemplo.com/x";'],
  ['regex con barra alterna', 'const r = /sword|axe/i; // fuera', 'const r = /sword|axe/i;'],
  ['regex con barras escapadas', 'const r = /a\\/\\/b/g; // fuera', 'const r = /a\\/\\/b/g;'],
  ['comentario de bloque', 'const a=1;\n/* multi\nlinea */\nconst b=2;', 'const a=1;\n\nconst b=2;'],
  ['comentario al inicio', '// cabecera\nconst a=1;', 'const a=1;'],
  ['comentario en medio de linea', 'const a=1; // nota\nconst b=2;', 'const a=1;\nconst b=2;'],
  ['comentario entre argumentos', 'f(\n  a, // el primero\n  b\n);', 'f(\n  a,\n  b\n);'],
  ['sin comentarios', 'const a=1;', null],
  ['comentario al final', 'const a=1;\n// fin', 'const a=1;'],
];

let fallos = 0;

for (const [nombre, entrada, esperado] of casos) {
  const out = stripComments(entrada);
  const ok = out === esperado;
  if (!ok) fallos++;
  console.log(`${ok ? 'PASA' : 'FALLA'}  ${nombre}`);
  if (!ok) {
    console.log(`     entrada  : ${JSON.stringify(entrada)}`);
    console.log(`     salida   : ${JSON.stringify(out)}`);
    console.log(`     esperado : ${JSON.stringify(esperado)}`);
  }
  if (out !== null) {
    try {
      parser.parse(out, { sourceType: 'unambiguous', plugins: ['jsx'] });
    } catch (e) {
      fallos++;
      console.log(`     NO PARSEA: ${e.message}`);
    }
  }
}

console.log('');
if (fallos) { console.log(`${fallos} fallo(s).`); process.exit(1); }
console.log('Todos los casos limite pasan.');