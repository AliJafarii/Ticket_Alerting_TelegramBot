const cron = require('node-cron');
const { Telegraf } = require('telegraf');
const logger = require('./logger');
const { fetchTickets } = require('./api');
const {
  appendHistory,
  loadAlerts,
  loadProviders,
  readHistory,
  updateAlert
} = require('./configManager');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHECK_INTERVAL_MINUTES = Math.max(1, Number(process.env.CHECK_INTERVAL_MINUTES || 30));
const SMART_DROP_PERCENT = Math.max(1, Number(process.env.SMART_DROP_PERCENT || 20));
const SMART_MIN_HISTORY = Math.max(2, Number(process.env.SMART_MIN_HISTORY || 6));
const NOTIFY_COOLDOWN_MINUTES = Math.max(5, Number(process.env.NOTIFY_COOLDOWN_MINUTES || 180));
const transportLabels = {
  flight: 'هواپیما',
  train: 'قطار',
  bus: 'اتوبوس'
};

function average(values) {
  const clean = values.filter((value) => Number.isFinite(value) && value > 0);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function formatPrice(value) {
  return Math.round(value).toLocaleString('fa-IR') + ' تومان';
}

function routeLabel(alert) {
  return `${alert.originName || alert.origin} → ${alert.destinationName || alert.destination} در تاریخ ${alert.jalaliDate || alert.date}`;
}

function addDays(date, days) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function fetchWeeklyTrend(alert, providers, firstDayLowest) {
  const days = [{
    date: alert.date,
    min: firstDayLowest,
    count: firstDayLowest ? 1 : 0
  }];

  for (let i = 1; i < 7; i += 1) {
    const date = addDays(alert.date, i);
    try {
      const result = await fetchTickets({
        transport: alert.transport,
        origin: alert.origin,
        destination: alert.destination,
        date,
        passengers: alert.passengers || 1
      }, providers);
      const prices = result.tickets.map((ticket) => ticket.price).filter(Boolean);
      days.push({
        date,
        min: prices.length ? Math.min(...prices) : null,
        count: result.tickets.length
      });
    } catch (error) {
      logger.warn(`Weekly trend failed for ${alert.id} on ${date}: ${error.message}`);
      days.push({ date, min: null, count: 0, error: error.message });
    }
  }

  const minima = days.map((day) => day.min).filter((value) => Number.isFinite(value) && value > 0);
  const avgDailyMin = average(minima);
  const currentDropPercent = avgDailyMin && firstDayLowest
    ? ((avgDailyMin - firstDayLowest) / avgDailyMin) * 100
    : null;

  return { days, avgDailyMin, currentDropPercent };
}

function shouldNotify(alert, lowestPrice, historyRows, weeklyTrend) {
  if (!lowestPrice) return { ok: false, reason: 'no price' };

  const lastNotifiedAt = alert.lastNotifiedAt ? new Date(alert.lastNotifiedAt).getTime() : 0;
  if (lastNotifiedAt && Date.now() - lastNotifiedAt < NOTIFY_COOLDOWN_MINUTES * 60 * 1000) {
    return { ok: false, reason: 'cooldown' };
  }

  if (alert.mode === 'threshold') {
    return {
      ok: lowestPrice <= Number(alert.thresholdPrice || 0),
      reason: `threshold ${alert.thresholdPrice}`
    };
  }

  if (weeklyTrend?.avgDailyMin && weeklyTrend.currentDropPercent >= SMART_DROP_PERCENT) {
    return {
      ok: true,
      reason: `weekly trend drop ${weeklyTrend.currentDropPercent.toFixed(1)}%`,
      avg: weeklyTrend.avgDailyMin,
      dropPercent: weeklyTrend.currentDropPercent,
      weeklyTrend
    };
  }

  if (historyRows.length < SMART_MIN_HISTORY) {
    return {
      ok: false,
      reason: 'not enough history ' + historyRows.length + '/' + SMART_MIN_HISTORY,
      weeklyTrend
    };
  }

  const avg = average(historyRows.map((row) => row.lowestPrice));
  if (!avg) return { ok: false, reason: 'not enough history' };
  const dropPercent = ((avg - lowestPrice) / avg) * 100;
  return {
    ok: dropPercent >= SMART_DROP_PERCENT,
    reason: `smart drop ${dropPercent.toFixed(1)}%`,
    avg,
    dropPercent
  };
}

function buildAlertMessage(alert, ticket, decision, errors) {
  const lines = [
    'هشدار قیمت بلیط',
    '',
    'مسیر: ' + routeLabel(alert),
    'نوع سفر: ' + (transportLabels[alert.transport] || alert.transport),
    'کمترین قیمت: ' + formatPrice(ticket.price),
    'منبع: ' + ticket.provider,
    'عنوان: ' + ticket.title
  ];
  if (ticket.departureTime) lines.push('زمان حرکت: ' + ticket.departureTime);
  if (ticket.seats !== null && ticket.seats !== undefined) lines.push('ظرفیت/صندلی: ' + ticket.seats);
  if (decision.avg) lines.push('میانگین تاریخی: ' + formatPrice(decision.avg));
  if (decision.dropPercent) lines.push('افت نسبت به میانگین: ' + decision.dropPercent.toFixed(1) + '٪');
  if (decision.weeklyTrend?.avgDailyMin) {
    lines.push('میانگین کف قیمت ۷ روز آینده: ' + formatPrice(decision.weeklyTrend.avgDailyMin));
  }
  if (ticket.deepLink) lines.push('لینک: ' + ticket.deepLink);
  if (errors.length) lines.push('', 'Providerهای ناموفق: ' + errors.map((e) => e.provider).join('، '));
  return lines.join('\n');
}

function buildNoProviderMessage(alert) {
  return [
    'هشدار ثبت شده، ولی فعلاً منبع قیمت فعال نیست.',
    '',
    'مسیر: ' + routeLabel(alert),
    'نوع سفر: ' + (transportLabels[alert.transport] || alert.transport),
    '',
    'برای اینکه alert واقعی بدهیم باید حداقل یک API قیمت برای این نوع سفر فعال باشد.'
  ].join('\n');
}

function buildNoTicketMessage(alert, errors) {
  const lines = [
    'برای این هشدار فعلاً قیمت پیدا نشد.',
    '',
    'مسیر: ' + routeLabel(alert),
    'نوع سفر: ' + (transportLabels[alert.transport] || alert.transport)
  ];
  if (errors.length) lines.push('', 'منبع‌های ناموفق: ' + errors.map((e) => e.provider).join('، '));
  return lines.join('\n');
}

function buildCurrentPriceMessage(alert, ticket, historyRows, weeklyTrend) {
  const weeklyLines = [];
  if (weeklyTrend?.avgDailyMin) {
    weeklyLines.push('میانگین کف قیمت ۷ روز آینده: ' + formatPrice(weeklyTrend.avgDailyMin));
  }
  if (weeklyTrend?.currentDropPercent !== null && weeklyTrend?.currentDropPercent !== undefined) {
    weeklyLines.push('فاصله قیمت فعلی با میانگین هفته: ' + weeklyTrend.currentDropPercent.toFixed(1) + '٪');
  }

  return [
    'قیمت فعلی ذخیره شد.',
    '',
    'مسیر: ' + routeLabel(alert),
    'نوع سفر: ' + (transportLabels[alert.transport] || alert.transport),
    'کمترین قیمت فعلی: ' + formatPrice(ticket.price),
    'منبع: ' + ticket.provider,
    'عنوان: ' + ticket.title,
    ticket.departureTime ? 'زمان حرکت: ' + ticket.departureTime : null,
    ticket.seats !== null && ticket.seats !== undefined ? 'ظرفیت/صندلی: ' + ticket.seats : null,
    ...weeklyLines,
    '',
    'برای حالت هوشمند باید چند نوبت قیمت جمع شود. الان ' + historyRows.length + ' رکورد داریم.'
  ].filter(Boolean).join('\n');
}

function shouldSendServiceMessage(alert, field) {
  const lastAt = alert[field] ? new Date(alert[field]).getTime() : 0;
  return !lastAt || Date.now() - lastAt > 6 * 60 * 60 * 1000;
}

async function checkAlert(bot, alert, providers) {
  const activeProviders = providers.filter((provider) =>
    provider.enabled !== false && (!provider.transports || provider.transports.includes(alert.transport))
  );
  if (!activeProviders.length) {
    logger.warn(`Alert ${alert.id}: no enabled providers for ${alert.transport}`);
    if (shouldSendServiceMessage(alert, 'lastProviderWarningAt')) {
      await bot.telegram.sendMessage(alert.chatId, buildNoProviderMessage(alert));
      updateAlert(alert.id, { lastProviderWarningAt: new Date().toISOString() });
    }
    return;
  }

  const params = {
    transport: alert.transport,
    origin: alert.origin,
    destination: alert.destination,
    date: alert.date,
    passengers: alert.passengers || 1
  };
  const { tickets, errors } = await fetchTickets(params, providers);
  if (!tickets.length) {
    logger.info(`Alert ${alert.id}: no tickets found`);
    if (shouldSendServiceMessage(alert, 'lastNoTicketWarningAt')) {
      await bot.telegram.sendMessage(alert.chatId, buildNoTicketMessage(alert, errors), {
        disable_web_page_preview: true
      });
      updateAlert(alert.id, { lastNoTicketWarningAt: new Date().toISOString() });
    }
    return;
  }

  const lowest = tickets[0];
  const weeklyTrend = alert.mode === 'smart'
    ? await fetchWeeklyTrend(alert, providers, lowest.price)
    : null;

  appendHistory({
    alertId: alert.id,
    transport: alert.transport,
    origin: alert.origin,
    destination: alert.destination,
    date: alert.date,
    lowestPrice: lowest.price,
    provider: lowest.provider
  });

  const historyRows = readHistory(alert, 2000);
  const decision = shouldNotify(alert, lowest.price, historyRows, weeklyTrend);
  logger.info(`Alert ${alert.id}: lowest=${lowest.price}, notify=${decision.ok}, reason=${decision.reason}`);
  updateAlert(alert.id, { lastLowestPrice: lowest.price });

  if (alert.mode === 'smart' && decision.reason?.startsWith('not enough history') && shouldSendServiceMessage(alert, 'lastBaselineMessageAt')) {
    await bot.telegram.sendMessage(alert.chatId, buildCurrentPriceMessage(alert, lowest, historyRows, weeklyTrend), {
      disable_web_page_preview: true
    });
    updateAlert(alert.id, { lastBaselineMessageAt: new Date().toISOString(), lastLowestPrice: lowest.price });
    return;
  }

  if (!decision.ok) return;

  await bot.telegram.sendMessage(alert.chatId, buildAlertMessage(alert, lowest, decision, errors), {
    disable_web_page_preview: true
  });
  updateAlert(alert.id, { lastNotifiedAt: new Date().toISOString(), lastLowestPrice: lowest.price });
}

async function processAlerts(bot) {
  const alerts = Object.values(loadAlerts()).filter((alert) => alert.enabled);
  const providers = loadProviders();
  for (const alert of alerts) {
    try {
      await checkAlert(bot, alert, providers);
    } catch (error) {
      logger.error(`Alert ${alert.id}: ${error.message}`);
    }
  }
}

function startScheduler(bot) {
  const expr = `*/${CHECK_INTERVAL_MINUTES} * * * *`;
  cron.schedule(expr, () => processAlerts(bot));
  logger.info(`Scheduler started: every ${CHECK_INTERVAL_MINUTES} minute(s).`);
  processAlerts(bot).catch((error) => logger.error(`Initial alert check failed: ${error.message}`));
}

function createBotForScheduler() {
  if (!BOT_TOKEN) return null;
  return new Telegraf(BOT_TOKEN);
}

module.exports = { startScheduler, processAlerts, createBotForScheduler, checkAlert };
