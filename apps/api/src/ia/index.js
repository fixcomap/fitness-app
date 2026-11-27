// Arma el proveedor de IA según la configuración (ver config.js). null si la IA está apagada.
const { crearClienteGemini, crearProveedorGemini } = require('./gemini');
const { crearClientesClaude, crearProveedorClaude } = require('./claude');
const { crearProveedorFalso } = require('./falso');

function crearProveedor(configIa) {
  if (!configIa.proveedor) return null;
  if (configIa.familia === 'falso') return crearProveedorFalso();
  const { proveedor, modeloFoto, modeloCoach, clave, vertex } = configIa;
  if (configIa.familia === 'claude') {
    return crearProveedorClaude({
      clientePara: crearClientesClaude({ clave, vertex }),
      modeloFoto,
      modeloCoach,
      nombre: proveedor,
    });
  }
  return crearProveedorGemini({
    cliente: crearClienteGemini({ clave, vertex }),
    modeloFoto,
    modeloCoach,
    nombre: proveedor,
  });
}

module.exports = { crearProveedor };
