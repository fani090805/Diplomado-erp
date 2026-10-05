'use strict';

/**
 * Datos ficticios (México, MXN, español) para el generador de ventas demo.
 * Todo lo que se crea con ellos lleva la marca DEMO_MARK para poder borrarlo.
 */

const DEMO_MARK = 'seed:demo-sales';

/** Productos comerciales variados: [nombre, categoría, unidad, precio de venta base]. */
const PRODUCT_TEMPLATES = [
  ['Martillo de uña 16 oz', 'Ferretería', 'pza', 189],
  ['Juego de desarmadores 6 piezas', 'Ferretería', 'jgo', 249],
  ['Cinta métrica 5 m', 'Ferretería', 'pza', 119],
  ['Pinzas de electricista 8"', 'Ferretería', 'pza', 215],
  ['Taladro percutor 1/2" 650 W', 'Herramienta eléctrica', 'pza', 1499],
  ['Esmeriladora angular 4 1/2"', 'Herramienta eléctrica', 'pza', 1289],
  ['Rotomartillo SDS Plus 800 W', 'Herramienta eléctrica', 'pza', 3290],
  ['Escalera de tijera aluminio 5 peldaños', 'Ferretería', 'pza', 1890],
  ['Cemento gris 50 kg', 'Construcción', 'bulto', 245],
  ['Varilla corrugada 3/8" 12 m', 'Construcción', 'pza', 168],
  ['Pintura vinílica blanca 19 L', 'Pinturas', 'cub', 1650],
  ['Impermeabilizante acrílico 19 L', 'Pinturas', 'cub', 2390],
  ['Brocha de cerda 3"', 'Pinturas', 'pza', 59],
  ['Rodillo de felpa 9"', 'Pinturas', 'pza', 89],
  ['Foco LED 9 W luz cálida', 'Eléctrico', 'pza', 39],
  ['Cable THW calibre 12 rollo 100 m', 'Eléctrico', 'rollo', 1590],
  ['Contacto doble polarizado', 'Eléctrico', 'pza', 45],
  ['Extensión eléctrica 5 m', 'Eléctrico', 'pza', 129],
  ['Hoja carta bond 75 g (500 hojas)', 'Papelería', 'paq', 125],
  ['Bolígrafo tinta azul caja 12', 'Papelería', 'caja', 69],
  ['Cuaderno profesional 100 hojas', 'Papelería', 'pza', 49],
  ['Tóner láser negro compatible', 'Oficina', 'pza', 899],
  ['Silla ejecutiva ergonómica', 'Mobiliario', 'pza', 3490],
  ['Escritorio de melamina 1.20 m', 'Mobiliario', 'pza', 2890],
  ['Archivero metálico 4 gavetas', 'Mobiliario', 'pza', 4290],
  ['Monitor LED 24" Full HD', 'Electrónica', 'pza', 2799],
  ['Teclado y mouse inalámbricos', 'Electrónica', 'jgo', 449],
  ['Disco SSD 1 TB', 'Electrónica', 'pza', 1390],
  ['Laptop 15.6" 16 GB RAM', 'Electrónica', 'pza', 8500],
  ['Impresora multifuncional de tinta', 'Electrónica', 'pza', 3990],
  ['No break 1000 VA', 'Electrónica', 'pza', 1750],
  ['Detergente en polvo 5 kg', 'Limpieza', 'bolsa', 239],
  ['Cloro 4 L', 'Limpieza', 'gal', 42],
  ['Jabón líquido para manos 5 L', 'Limpieza', 'gal', 165],
  ['Papel higiénico jumbo caja 6 rollos', 'Limpieza', 'caja', 389],
  ['Bolsa para basura 90×120 (paq. 50)', 'Limpieza', 'paq', 149],
  ['Café de grano Chiapas 1 kg', 'Abarrotes', 'bolsa', 349],
  ['Agua purificada garrafón 20 L', 'Abarrotes', 'pza', 25],
  ['Azúcar estándar 2 kg', 'Abarrotes', 'bolsa', 58],
  ['Aceite vegetal 1 L', 'Abarrotes', 'pza', 45],
  ['Vasos desechables 8 oz (paq. 50)', 'Abarrotes', 'paq', 39],
  ['Guantes de nitrilo caja 100', 'Seguridad', 'caja', 189],
  ['Casco de seguridad tipo I', 'Seguridad', 'pza', 159],
  ['Lentes de seguridad claros', 'Seguridad', 'pza', 55],
  ['Extintor PQS 4.5 kg', 'Seguridad', 'pza', 799],
];

const COMPANY_PREFIXES = [
  'Comercializadora', 'Distribuidora', 'Grupo', 'Servicios Integrales', 'Constructora',
  'Abarrotes', 'Ferretería', 'Papelería', 'Industrias', 'Corporativo', 'Proveedora', 'Consultores',
];
const COMPANY_CORES = [
  'del Bajío', 'Azteca', 'del Norte', 'Sol de Oro', 'La Esperanza', 'Monte Alto', 'Río Verde',
  'Los Pinos', 'San Miguel', 'El Faro', 'Tres Hermanos', 'del Pacífico', 'Puerta del Sol',
  'La Huasteca', 'Valle Real', 'Quetzal', 'Cumbres', 'Anáhuac', 'Mixteca', 'del Golfo',
];
const LEGAL_SUFFIXES = ['S.A. de C.V.', 'S. de R.L. de C.V.', 'S.A.P.I. de C.V.', 'S.C.'];
const FIRST_NAMES = [
  'María', 'José', 'Guadalupe', 'Juan', 'Fernanda', 'Luis', 'Alejandra', 'Carlos', 'Sofía',
  'Miguel', 'Valeria', 'Jorge', 'Daniela', 'Ricardo', 'Patricia', 'Arturo', 'Ximena', 'Raúl',
];
const LAST_NAMES = [
  'Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Rodríguez', 'Sánchez',
  'Ramírez', 'Cruz', 'Flores', 'Gómez', 'Morales', 'Vázquez', 'Reyes', 'Jiménez', 'Torres', 'Ruiz',
];
const CITIES = [
  'Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Querétaro', 'León', 'Mérida',
  'Toluca', 'Aguascalientes', 'San Luis Potosí', 'Morelia', 'Oaxaca', 'Veracruz', 'Chihuahua',
  'Hermosillo', 'Tijuana', 'Cancún', 'Saltillo', 'Culiacán', 'Pachuca',
];
const REJECTION_REASONS = [
  'Cliente canceló el pedido.',
  'Precio fuera de lo autorizado.',
  'Crédito del cliente excedido.',
  'Datos de facturación incompletos.',
  'Producto sin existencia suficiente al momento de surtir.',
  'Pedido duplicado.',
];

/** Peso de ventas por mes (ene = 0): más en noviembre-diciembre, menos en enero. */
const MONTH_WEIGHTS = [0.6, 0.8, 0.9, 0.95, 1, 0.95, 0.95, 1, 1, 1.05, 1.4, 1.7];
/** Peso por día de la semana (dom = 0): días hábiles con más peso. */
const WEEKDAY_WEIGHTS = [0.2, 1, 1, 1, 1, 1, 0.5];

/** PRNG determinista (mulberry32) para poder repetir una generación con --seed. */
function createRng(seed) {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min, max) => min + Math.floor(next() * (max - min + 1));
  const pick = (list) => list[Math.floor(next() * list.length)];
  return { next, int, pick };
}

const ALNUM = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** RFC con formato válido: 3 letras (moral) o 4 (física) + AAMMDD + homoclave. */
function fakeRfc(rng, name, isCompany) {
  const letters = stripAccents(name).toUpperCase().replace(/[^A-Z]/g, '');
  const length = isCompany ? 3 : 4;
  let prefix = letters.slice(0, length);
  while (prefix.length < length) prefix += LETTERS[rng.int(0, LETTERS.length - 1)];
  const date = `${String(rng.int(60, 99)).padStart(2, '0')}${String(rng.int(1, 12)).padStart(2, '0')}${String(rng.int(1, 28)).padStart(2, '0')}`;
  const homoclave = `${ALNUM[rng.int(0, ALNUM.length - 1)]}${ALNUM[rng.int(0, ALNUM.length - 1)]}${rng.pick(['A', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])}`;
  return `${prefix}${date}${homoclave}`;
}

/** Cliente ficticio: 70% empresas (razón social) y 30% personas físicas. */
function fakeCustomer(rng, index) {
  const isCompany = rng.next() < 0.7;
  const city = rng.pick(CITIES);
  const name = isCompany
    ? `${rng.pick(COMPANY_PREFIXES)} ${rng.pick(COMPANY_CORES)} ${rng.pick(LEGAL_SUFFIXES)}`
    : `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)} ${rng.pick(LAST_NAMES)}`;
  const slug = stripAccents(name).toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14) || 'cliente';
  return {
    code: `DEMO-C${String(index).padStart(4, '0')}`,
    name: name.slice(0, 120),
    taxId: fakeRfc(rng, name, isCompany),
    email: `${slug}${index}@ejemplo.mx`,
    phone: `${rng.pick(['55', '33', '81', '222', '442', '477', '999'])}${String(rng.int(1000000, 9999999))}`.slice(0, 10),
    city,
  };
}

module.exports = {
  DEMO_MARK,
  PRODUCT_TEMPLATES,
  REJECTION_REASONS,
  MONTH_WEIGHTS,
  WEEKDAY_WEIGHTS,
  createRng,
  fakeCustomer,
  fakeRfc,
};
