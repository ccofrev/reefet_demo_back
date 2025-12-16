// backend/routes/despachoRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Despacho = require('../models/Despacho'); 
const Deposito = require('../models/Deposito'); 

const router = express.Router();

// 1. GET / (Obtener todos los despachos - PROTEGIDA)
router.get('/', protect, async (req, res) => {
    try {
        const { search } = req.query;
        const usuarioDepositosIds = req.user.depositosIds; 
        
        let query = {};
        
        // 1. APLICAR FILTRO DE SEGURIDAD (POR DEPÓSITO ID)
        query.deposito = { $in: usuarioDepositosIds };

        // 2. APLICAR FILTRO DE BÚSQUEDA (si existe)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { idNodo: searchRegex },
                { idReefer: searchRegex }
            ];
        }

        const despachos = await Despacho.find(query)
            .populate('deposito', 'nombre identificadorNodo') 
            .sort({ tServ: -1 })
            .limit(100);
            
        res.json(despachos);

    } catch (error) {
        console.error('Error al obtener despachos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// 2. POST / (Recibir nuevo registro de despacho)
router.post('/', async (req, res) => {
    try {
        const { identificadorNodo, idNodo, idReefer, tServ, ...otrosDatos } = req.body;

        // 1. Buscar el Depósito por el identificador del nodo
        const depositoEncontrado = await Deposito.findOne({ identificadorNodo });

        if (!depositoEncontrado) {
            return res.status(404).json({ message: `No se encontró un depósito asociado al nodo: ${identificadorNodo}` });
        }

        // 2. Crear el nuevo registro de Despacho usando el ID del depósito
        const nuevoDespacho = await Despacho.create({
            idNodo,
            idReefer,
            tServ,
            ...otrosDatos,
            deposito: depositoEncontrado._id // 👈 Guardamos la referencia ID
        });

        res.status(201).json({ 
            message: "Despacho registrado con éxito.",
            despacho: nuevoDespacho
        });

    } catch (error) {
        console.error('Error al registrar despacho:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

module.exports = router;