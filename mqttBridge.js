// mqttBridge.js

require('dotenv').config();
const mqtt = require('mqtt');
const axios = require('axios');

// ----------------------------------------------------
// 1. CONFIGURACIÓN DEL BROKER Y API
// ----------------------------------------------------

// URL de tu API de Despachos. Asegúrate de que apunte a la ruta pública HTTPS.
const API_URL = 'https://apireefet.ccofrev.com/api/despachos'; 

// Detalles de conexión MQTT (usa localhost si el broker está en el mismo Droplet)
const MQTT_BROKER_URL = 'mqtt://localhost:1883'; // Si el broker es local
const MQTT_TOPIC = 'reefet/data';

// ----------------------------------------------------
// 2. INICIAR CONEXIÓN Y SUSCRIPCIÓN MQTT
// ----------------------------------------------------

const client  = mqtt.connect(MQTT_BROKER_URL);

client.on('connect', function () {
    console.log(`[MQTT] Conectado al broker: ${MQTT_BROKER_URL}`);
    client.subscribe(MQTT_TOPIC, function (err) {
        if (!err) {
            console.log(`[MQTT] Suscrito al topic: ${MQTT_TOPIC}`);
        } else {
            console.error(`[MQTT] Error al suscribirse: ${err}`);
        }
    });
});

client.on('error', function (error) {
    console.error(`[MQTT] Error de conexión: ${error}`);
    // Puedes añadir lógica para intentar reconectar aquí
});

// ----------------------------------------------------
// 3. MANEJO DE MENSAJES Y LLAMADA A LA API
// ----------------------------------------------------

client.on('message', async function (topic, message) {
    console.log(`[MQTT] Mensaje recibido en ${topic}.`);
    
    let payload;
    try {
        // Intenta parsear el payload como JSON
        payload = JSON.parse(message.toString());
        
        // Verifica que el payload tenga los campos necesarios para tu API
        if (!payload.identificadorNodo || !payload.idReefer) {
            console.warn('[API] Payload incompleto. Saltando registro.');
            return;
        }

    } catch (e) {
        console.error('[API] Error al parsear JSON del mensaje MQTT:', e);
        return;
    }

    // Realizar la llamada POST a tu API de Despachos
    try {
        const response = await axios.post(API_URL, payload);

        if (response.status === 201) {
            console.log(`[API] Despacho registrado con éxito. Status: ${response.status}`);
        } else {
            console.warn(`[API] Registro exitoso pero status inesperado: ${response.status}`);
        }

    } catch (error) {
        console.error('[API] ERROR al registrar Despacho:', error.response ? error.response.data : error.message);
    }
});