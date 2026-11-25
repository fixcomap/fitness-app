// Verifica con oEmbed de YouTube que los videos del catálogo sigan disponibles.
// Uso: npm run verificar-videos
// Lista los que fallan (oEmbed distinto de 200) y los que cambiaron de canal.
// Sale con código 1 si hay alguno con problemas.
import { readFileSync } from 'node:fs';

// Por defecto el catálogo de la app; se puede pasar otra ruta para probar.
const ruta = process.argv[2] ?? new URL('../src/data/ejercicios.json', import.meta.url);
const ejercicios = JSON.parse(readFileSync(ruta, 'utf8'));
const conVideo = ejercicios.filter((e) => e.youtubeId?.trim());
const EN_PARALELO = 5;

async function verificar(e) {
  const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${e.youtubeId}&format=json`;
  try {
    const r = await fetch(url);
    if (r.status !== 200) return { e, problema: `oEmbed respondió ${r.status}` };
    const { author_name: canal } = await r.json();
    if (e.videoCanal && canal !== e.videoCanal) return { e, problema: `ahora es de "${canal}", no de "${e.videoCanal}"` };
    return null;
  } catch (error) {
    return { e, problema: `no se pudo consultar (${error.message})` };
  }
}

const problemas = [];
for (let i = 0; i < conVideo.length; i += EN_PARALELO) {
  const tanda = await Promise.all(conVideo.slice(i, i + EN_PARALELO).map(verificar));
  problemas.push(...tanda.filter(Boolean));
}

console.log(`${conVideo.length} videos verificados de ${ejercicios.length} ejercicios.`);
if (problemas.length === 0) {
  console.log('Todos responden bien.');
} else {
  console.log(`\n${problemas.length} con problemas:`);
  for (const { e, problema } of problemas) console.log(`- ${e.id} (${e.youtubeId}): ${problema}`);
  process.exitCode = 1;
}
