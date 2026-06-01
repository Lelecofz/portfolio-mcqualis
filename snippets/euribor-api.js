/**
 * Fetches live Euribor rates (3M, 6M, 12M) from the BPstat API
 * (Banco de Portugal official statistics platform).
 *
 * The response is an unconventional flat array where values are indexed by
 * series × observation position rather than named keys — the SERIES_ORDER
 * mapping below resolves which slice belongs to each term.
 *
 * Result is cached for the session to avoid redundant requests when the
 * user switches between terms in the simulator.
 */

const BPSTAT_URL =
  'https://bpstat.bportugal.pt/data/v1/domains/22/datasets/' +
  '2829cb9155cb4f6ba6906db6b204c4bc/?lang=PT&series_ids=13168436,13168437,13168438';

const SERIES_ORDER = [
  { prazo: '3M',  id: 13168436 },
  { prazo: '12M', id: 13168437 },
  { prazo: '6M',  id: 13168438 },
];

let _euriborCache = null;

async function fetchEuriborMensal() {
  if (_euriborCache) return _euriborCache;

  const response = await fetch(BPSTAT_URL);
  if (!response.ok) throw new Error(`BPstat API: HTTP ${response.status}`);

  const data     = await response.json();
  const values   = data.value;
  const dates    = data.dimension.reference_date.category.index;
  const obsCount = dates.length;

  // Each series occupies a contiguous block of obsCount values.
  // The last entry in each block is the most recent monthly average.
  const taxas = {};
  SERIES_ORDER.forEach(({ prazo }, i) => {
    const lastIndex = i * obsCount + (obsCount - 1);
    taxas[prazo] = parseFloat(values[lastIndex].toFixed(3));
  });

  _euriborCache = { ...taxas, data: dates[obsCount - 1] };
  return _euriborCache;
}

/**
 * Populates the simulator's Euribor field for the selected term.
 * Locks the field as read-only while data is fresh from the API.
 * Falls back to manual input if the API is unreachable.
 */
async function preencherEuriborNoSimulador(prazo) {
  const input = document.getElementById('sim-euribor');
  if (!input) return;

  try {
    const taxas = await fetchEuriborMensal();
    input.value    = taxas[prazo];
    input.readOnly = true;
    input.dispatchEvent(new Event('input'));

    const [ano, mes] = taxas.data.split('-');
    const sourcePt   = document.getElementById('sim-euribor-source-pt');
    const sourceEn   = document.getElementById('sim-euribor-source-en');
    if (sourcePt) sourcePt.textContent = `Banco de Portugal — média mensal ${mes}/${ano}`;
    if (sourceEn) sourceEn.textContent = `Banco de Portugal — monthly average ${mes}/${ano}`;
  } catch (err) {
    // Graceful degradation: unlock the field so the user can enter a rate manually
    console.warn('[MCQualis] Euribor API unavailable — unlocking manual input.', err);
    input.readOnly = false;

    ['sim-euribor-source-pt', 'sim-euribor-source-en'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '';
    });
  }
}
