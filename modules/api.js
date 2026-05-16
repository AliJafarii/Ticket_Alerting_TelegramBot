const axios = require('axios');
const logger = require('./logger');

const DEFAULT_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS || 20000);

// Map provider names to Persian display names
const PROVIDER_NAMES_FA = {
  'mrbilit-flight': 'مستربلیط',
  'flytoday-flight': 'فلای‌تودی',
  'safarmarket-flight-calendar': 'سفرمارکت',
  'alibaba-flight': 'علی‌بابا',
  'trip-flight': 'تریپ',
  'eligasht-flight': 'الی‌گشت',
  'snapptrip-flight': 'اسنپ‌تریپ'
};

function getPath(obj, path) {
  if (!path) return undefined;
  return path.split('.').reduce((acc, part) => {
    if (acc === undefined || acc === null) return undefined;
    if (part === '[]') return Array.isArray(acc) ? acc : undefined;
    return acc[part];
  }, obj);
}

function flatten(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === 'object') {
    if (Array.isArray(value.items)) return flatten(value.items);
    if (Array.isArray(value.results)) return flatten(value.results);
    if (Array.isArray(value.data)) return flatten(value.data);
    if (Array.isArray(value.flights)) return flatten(value.flights);
  }
  return [value];
}

function asNumber(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).replace(/[,٬\s]/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function template(value, params) {
  if (typeof value === 'string') {
    return value.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? process.env[key] ?? '');
  }
  if (Array.isArray(value)) return value.map((item) => template(item, params));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, template(val, params)]));
  }
  return value;
}

function extractFlightNumber(raw, providerName) {
  // Try to extract flight number from various formats
  const candidates = [
    raw.flightNumber,
    raw.FlightNumber,
    raw.flightNo,
    raw.flight_code,
    raw.code,
    raw?.segment?.flightNumber,
    raw?.segments?.[0]?.flightNumber,
    raw?.Legs?.[0]?.FlightNumber,
    raw?.route?.flightNumber
  ];
  for (const c of candidates) {
    if (c) return String(c);
  }
  return null;
}

function extractAirlineName(raw) {
  return raw.airlineName || raw.airline || raw.AirlineName ||
    raw?.airline?.name || raw?.Airline?.PersianTitle ||
    raw?.Airline?.EnglishTitle || null;
}

function normalizeTicket(raw, providerName, transport) {
  const price = asNumber(
    raw.price ?? raw.amount ?? raw.payablePrice ?? raw.totalPrice ?? raw.finalPrice ??
    raw?.pricing?.totalPayablePrice ?? raw?.pricing?.payablePrice ??
    raw?.pricing?.pricingDetails?.find?.((x) => x.passengerType === 'ADULT')?.payablePrice
  );
  if (!price) return null;

  const segment = raw.routes?.[0]?.segments?.[0] || raw.segments?.[0] || raw.segment || raw;
  const flightNumber = extractFlightNumber(raw, providerName);
  const airlineName = extractAirlineName(raw);

  return {
    provider: providerName,
    providerFa: PROVIDER_NAMES_FA[providerName] || providerName,
    price,
    airlineName,
    flightNumber,
    departureTime: segment.departureDateTime || segment.departureTime || raw.departureDateTime || raw.departureTime || null,
    arrivalTime: segment.arrivalDateTime || segment.arrivalTime || raw.arrivalDateTime || raw.arrivalTime || null,
    seats: segment.seatsRemaining ?? raw.seatsRemaining ?? raw.capacity ?? null,
    deepLink: raw.url || raw.deepLink || raw.link || null,
    raw
  };
}

function normalizeMrbilitFlight(raw, providerName, transport, params) {
  const segment = raw.Segments?.[0];
  const leg = segment?.Legs?.[0];
  if (!leg) return [];

  return (raw.Prices || []).map((priceOption) => {
    const adultFare = (priceOption.PassengerFares || []).find((fare) => fare.PaxType === 'ADL') ||
      priceOption.PassengerFares?.[0];
    const totalFare = asNumber(adultFare?.TotalFare);
    if (!totalFare) return null;
    const airline = leg.Airline?.PersianTitle || leg.Airline?.EnglishTitle || leg.AirlineCode || providerName;
    return {
      provider: providerName,
      providerFa: PROVIDER_NAMES_FA[providerName] || providerName,
      price: Math.round(totalFare / 10),
      airlineName: airline,
      flightNumber: leg.FlightNumber || null,
      departureTime: leg.DepartureTime || null,
      arrivalTime: leg.ArrivalTime || null,
      seats: priceOption.Capacity ?? null,
      deepLink: 'https://www.mrbilit.com/flight/search?origin=' + params.origin + '&destination=' + params.destination + '&date=' + params.date + '&adult=' + (params.passengers || 1),
      raw: { flightId: raw.Id, priceUniqueId: priceOption.UniqueId }
    };
  }).filter(Boolean);
}

function normalizeFlytodayFlight(raw, providerName, transport, params) {
  if (raw.departureDate !== params.date) return [];

  const cheapestPrice = asNumber(raw.cheapestPrice);
  if (!cheapestPrice) return [];

  return [{
    provider: providerName,
    providerFa: PROVIDER_NAMES_FA[providerName] || providerName,
    price: Math.round(cheapestPrice / 10),
    airlineName: raw.airline || null,
    flightNumber: raw.flightNumber || null,
    departureTime: raw.departureDate || null,
    arrivalTime: null,
    seats: null,
    deepLink: 'https://www.flytoday.ir/flight/search?departure=' +
      String(params.origin || '').toLowerCase() + ',1&arrival=' +
      String(params.destination || '').toLowerCase() + ',1&departureDate=' +
      params.date + '&adt=' + (params.passengers || 1) +
      '&chd=0&inf=0&cabin=1&isDomestic=true&isAnyWhere=false',
    raw
  }];
}

function normalizeSafarmarketCalendar(raw, providerName, transport, params) {
  const item = raw?.cal?.[params.date] || raw?.[params.date] || raw;
  const minPrice = asNumber(item?.minPrice);
  if (!minPrice) return [];

  return [{
    provider: providerName,
    providerFa: PROVIDER_NAMES_FA[providerName] || providerName,
    price: Math.round(minPrice / 10),
    airlineName: null,
    flightNumber: null,
    departureTime: item.date || params.date,
    arrivalTime: null,
    seats: null,
    deepLink: 'https://safarmarket.com/flights/c' + params.origin + '-c' + params.destination + '/' +
      params.date + '/0/economy/' + (params.passengers || 1) + 'adults/0children/0infants',
    raw: item
  }];
}

function normalizeTickets(raw, providerName, transport, params) {
  if (providerName === 'mrbilit-flight' || raw.Prices || raw.Segments) {
    return normalizeMrbilitFlight(raw, providerName, transport, params);
  }
  if (providerName === 'flytoday-flight' || raw.cheapestPrice) {
    return normalizeFlytodayFlight(raw, providerName, transport, params);
  }
  if (providerName === 'safarmarket-flight-calendar') {
    return normalizeSafarmarketCalendar(raw, providerName, transport, params);
  }
  const ticket = normalizeTicket(raw, providerName, transport);
  return ticket ? [ticket] : [];
}

async function fetchProvider(provider, params) {
  const request = template(provider.request, {
    ...params,
    originLower: String(params.origin || '').toLowerCase(),
    destinationLower: String(params.destination || '').toLowerCase(),
    destinationAll: params.destination && params.destination.length === 3 ? params.destination + 'ALL' : params.destination
  });
  const response = await axios({
    method: request.method || 'GET',
    url: request.url,
    headers: request.headers || {},
    data: request.body,
    params: request.query,
    timeout: request.timeoutMs || DEFAULT_TIMEOUT_MS,
    validateStatus: (status) => status >= 200 && status < 500
  });

  if (response.status >= 400) {
    throw new Error('HTTP ' + response.status);
  }

  const root = provider.responsePath ? getPath(response.data, provider.responsePath) : response.data;
  return flatten(root).flatMap((item) => normalizeTickets(item, provider.name, params.transport, params));
}

async function fetchTickets(params, providers) {
  const enabled = providers.filter((provider) =>
    provider.enabled !== false && (!provider.transports || provider.transports.includes(params.transport))
  );
  const tickets = [];
  const errors = [];

  for (const provider of enabled) {
    try {
      const items = await fetchProvider(provider, params);
      tickets.push(...items);
      if (items.length) {
        logger.info(`Provider ${provider.name}: ${items.length} ticket(s)`);
      }
    } catch (error) {
      errors.push({ provider: provider.name, error: error.message });
      logger.warn(`Provider ${provider.name} failed: ${error.message}`);
    }
  }

  tickets.sort((a, b) => a.price - b.price);
  return { tickets, errors };
}

module.exports = { fetchTickets, PROVIDER_NAMES_FA };
