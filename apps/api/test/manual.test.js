// El manual del coach (src/ia/guias/manual-coach.md): largo, temas y que cada dato tenga su fuente.
const test = require('node:test');
const assert = require('node:assert');
const { MANUAL_COACH } = require('../src/ia/prompts');

const FUENTE = /\((ISSN|IUSCA|ACSM|OMS|AASM|Libro)[^)]*\b(19|20)\d\d\b[^)]*\)|[Rr]egla de la app/;

// Líneas de lista con números que no nombran una fuente: ni ellas, ni el título bajo el que están,
// ni (si son una sublista) el punto del que cuelgan.
function datosSinFuente(markdown) {
  const faltan = [];
  let titulo = '';
  let padre = '';
  for (const linea of markdown.split('\n')) {
    if (linea.startsWith('#')) titulo = linea;
    if (linea.startsWith('- ')) padre = linea;
    const esSublista = /^\s+- /.test(linea);
    const esDato = /^\s*- /.test(linea) && /\d/.test(linea);
    const conFuente = FUENTE.test(linea) || FUENTE.test(titulo) || (esSublista && FUENTE.test(padre));
    if (esDato && !conFuente) faltan.push(linea.trim());
  }
  return faltan;
}

test('datosSinFuente encuentra los datos sin fuente', () => {
  const md = [
    '## Proteína',
    '- 1,4 a 2,0 g/kg (ISSN, proteína, 2017).',
    '- 3 g por día.',
    '- Sin números no hace falta.',
    '### Creatina (ISSN, creatina, 2017)',
    '- Carga de 5 g cuatro veces por día.',
    '- Nunca menos de 1200 kcal (regla de la app).',
    '## Fuerza',
    '- Por nivel (ACSM, progresión en fuerza, 2009):',
    '  - Principiantes: 2 a 3 días.',
    '- Sin fuente:',
    '  - 4 a 6 días.',
  ].join('\n');
  assert.deepStrictEqual(datosSinFuente(md), ['- 3 g por día.', '- 4 a 6 días.']);
});

test('el manual tiene entre 4.000 y 6.500 palabras', () => {
  const palabras = MANUAL_COACH.split(/\s+/).filter(Boolean).length;
  assert.ok(palabras >= 4000 && palabras <= 6500, `tiene ${palabras} palabras`);
});

test('el manual está organizado por los temas pedidos, en orden', () => {
  const temas = MANUAL_COACH.match(/^## \d\. .+$/gm);
  assert.deepStrictEqual(temas, [
    '## 1. Energía y déficit seguro',
    '## 2. Proteína',
    '## 3. Carbohidratos y timing',
    '## 4. Hidratación',
    '## 5. Suplementos',
    '## 6. Entrenamiento de fuerza e hipertrofia',
    '## 7. Recuperación',
    '## 8. Señales para derivar a un profesional',
  ]);
});

test('cada dato con números del manual nombra su fuente', () => {
  // Desde el primer tema: la introducción y la tabla de fuentes no son recomendaciones.
  assert.deepStrictEqual(datosSinFuente(MANUAL_COACH.slice(MANUAL_COACH.indexOf('## 1.'))), []);
});

test('el manual marca las contradicciones y cuál se prioriza', () => {
  const contradicciones = MANUAL_COACH.match(/\*\*Contradicci[óo]n[^*]*\*\*/g) ?? [];
  assert.ok(contradicciones.length >= 5);
  for (const parrafo of MANUAL_COACH.split('\n').filter((l) => l.includes('**Contradicci'))) {
    assert.match(parrafo, /se prioriza|Se toma/i);
  }
});
