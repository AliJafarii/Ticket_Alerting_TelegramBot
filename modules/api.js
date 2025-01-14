// modules/api.js

const axios = require('axios');
const logger = require('./logger');

const API_URL = process.env.API_URL;

if (!API_URL) {
  logger.error('API_URL is not defined in the .env file.');
  process.exit(1);
}

const fetchFlightData = async (params) => {
  const {
    origin,
    destination,
    adultCount,
    departureDate
  } = params;

  const headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:134.0) Gecko/20100101 Firefox/134.0',
    'Accept': 'application/json',
    'Accept-Language': 'fa',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Content-Type': 'application/json',
    'Referer': 'https://www.snapptrip.com/',
    'channel': 'web',
    'User-Tracking-Key': 'd5e07644-5329-4270-bdbe-402009b9c88b',
    'Origin': 'https://www.snapptrip.com',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'Connection': 'keep-alive',
    'Priority': 'u=4',
    'Cookie': 'cookiesession1=678B28C6F61C4F2BDFA957BD16A21B86'
  };

  const data = {
    dateType: "jalali",
    origin,
    destination,
    destinationIsCity: true,
    originIsCity: true,
    adultCount,
    childCount: 0,
    infantCount: 0,
    departureDate,
    cabinType: "ECONOMY"
  };

  try {
    const response = await axios.post(API_URL, data, { headers });
    return response.data;
  } catch (error) {
    logger.error(`Error fetching flight data: ${error.message}`);
    throw error;
  }
};

module.exports = {
  fetchFlightData
};