// backend/routes/despachoRoutes.js (VERSIÓN FINAL CON LÓGICA DE ADMIN)
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Despacho = require('../models/Despacho'); 
const Nodo = require('../models/Nodo'); 
const mongoose = require('mongoose'); 

const router = express.Router();

// 1. GET / (Obtener todos los despachos - PROTEGIDA)
router.get('/', protect, async (req, res) => {
    try {
        const { search } = req.query;
        let query = {}; // Se inicializa vacía. Si es Admin, se mantendrá vacía.
        
        // 🌟🌟🌟 LÓGICA CLAVE: FILTRADO POR ROL 🌟🌟🌟
        if (!req.user.isAdmin) {
            // Lógica solo para USUARIOS NORMALES
            const usuarioDepositosIds = req.user.depositosIds; 
            
            if (!usuarioDepositosIds || usuarioDepositosIds.length === 0) {
                return res.json([]); // Si no es Admin y no tiene depósitos, no ve nada.
            }
            
            // 1. CONVERSIÓN EXPLÍCITA DE IDs
            const objectIdDepositos = usuarioDepositosIds.map(id => new mongoose.Types.ObjectId(id));
            
            // 2. APLICAR FILTRO DE SEGURIDAD
            query.deposito = { $in: objectIdDepositos };
        }
        // Si es Admin, 'query' sigue siendo {} (consulta todos los documentos)
        // 🌟🌟🌟 FIN LÓGICA CLAVE 🌟🌟🌟


        // 2. APLICAR FILTRO DE BÚSQUEDA (se aplica a la query existente o vacía)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            const searchConditions = [
                { idNodo: searchRegex },
                { idReefer: searchRegex }
            ];

            if (Object.keys(query).length > 0) {
                // Si ya hay un filtro (deposito para usuarios normales), combina con $and
                query = {
                    $and: [
                        query, // El filtro: {deposito: {$in: [...]}}
                        { $or: searchConditions }
                    ]
                };
            } else {
                // Si la query está vacía (Admin), aplica solo el $or de la búsqueda
                query = { $or: searchConditions };
            }
        }
        
        // 3. Ejecutar la consulta
        const despachos = await Despacho.find(query)
            .populate('deposito', 'nombre identificadorNodo') 
            .sort({ tServ: -1 })
            .limit(100);
            
        res.json(despachos);

    } catch (error) {
        console.error('ERROR AL CARGAR DESPACHOS:', error.message, error.stack); 
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener despachos.',
            details: error.message 
        });
    }
});

// 2. POST / (Recibir nuevo registro de despacho - RUTA DE IOT)
router.post('/', async (req, res) => {
    try {
        // El payload MQTT trae el identificador del sensor como idNodo
        const { idNodo, idReefer, tServ, ...otrosDatos } = req.body; 
        
        // 1. Buscar el NODO usando el idNodo recibido del sensor
        const nodoEncontrado = await Nodo.findOne({ idNodo }); 

        if (!nodoEncontrado) {
            return res.status(404).json({ message: `No se encontró un nodo asociado al identificador: ${idNodo}` });
        }
        
        // 2. Extraer los IDs
        const nodoId = nodoEncontrado._id; // ID del documento Nodo
        const depositoId = nodoEncontrado.deposito; // ID de depósito referenciado en el Nodo

        // 3. Crear el nuevo registro de Despacho con AMBAS referencias
        const nuevoDespacho = await Despacho.create({
            idNodo, 
            idReefer,
            tServ,
            ...otrosDatos,
            nodo: nodoId,      // 🌟 Referencia al documento Nodo (ObjectId)
            deposito: depositoId // Referencia al documento Depósito (ObjectId)
        });

        res.status(201).json({ 
            message: "Despacho registrado con éxito.",
            despacho: nuevoDespacho
        });

    } catch (error) {
        console.error('Error al registrar despacho desde MQTT:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;