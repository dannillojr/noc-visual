/**
 * state.js
 * Estado global da aplicação. Separado para facilitar debug e futura migração para React.
 */
const state = {
  // Dados vindos do backend (substituem os dados mockados)
  nodes:   {},   // { [id]: deviceObj com marker do Leaflet }
  links:   {},   // { [id]: linkObj (ainda frontend-only no MVP) }

  // Contadores locais (apenas para links, pois links ainda são frontend no MVP)
  linkCounter: 0,

  // Tool selecionada na toolbox
  tool: 'select',
  linkSrcId: null,

  // Flag de simulação de quebra
  breakSimActive: false,

  // Alertas exibidos no painel direito (vindos do backend)
  alerts: [],

  // Histórico de latência do device selecionado (para o gráfico)
  latencyHistory: Array(40).fill(null),

  // IDs de polling
  _summaryInterval: null,
  _alertsInterval:  null,
  _latencyInterval: null,
};
