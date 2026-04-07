const { Shoukaku, Connectors } = require('shoukaku');

function parseBoolean(value, defaultValue = false) {
  if (value == null || value === '') {
    return defaultValue;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function parseRequiredPort(value, fallback) {
  const port = Number(value ?? fallback);

  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('LAVALINK_PORT phai la so nguyen hop le trong khoang 1..65535.');
  }

  return port;
}

function createLavalink(client) {
  const host = process.env.LAVALINK_HOST?.trim() || '127.0.0.1';
  const port = parseRequiredPort(process.env.LAVALINK_PORT, 2333);
  const password = process.env.LAVALINK_PASSWORD?.trim() || 'youshallnotpass';
  const secure = parseBoolean(process.env.LAVALINK_SECURE, false);
  const nodeName = process.env.LAVALINK_NODE_NAME?.trim() || 'local';

  const nodes = [
    {
      name: nodeName,
      url: `${host}:${port}`,
      auth: password,
      secure
    }
  ];

  const lavalink = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
    resume: true,
    resumeTimeout: 30,
    resumeByLibrary: true,
    reconnectTries: 3,
    reconnectInterval: 5_000,
    restTimeout: 10_000,
    moveOnDisconnect: false,
    voiceConnectionTimeout: 15_000
  });

  lavalink.on('ready', (name) => {
    console.log(`[lavalink:${name}] ket noi thanh cong.`);
  });

  lavalink.on('error', (name, error) => {
    console.error(`[lavalink:${name}] error`, error);
  });

  lavalink.on('close', (name, code, reason) => {
    console.warn(`[lavalink:${name}] dong ket noi (${code}) ${reason || ''}`.trim());
  });

  lavalink.on('disconnect', (name, count) => {
    console.warn(`[lavalink:${name}] dang thu ket noi lai, lan ${count}.`);
  });

  return lavalink;
}

module.exports = {
  createLavalink
};
