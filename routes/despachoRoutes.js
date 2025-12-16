// backend/routes/despachoRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Despacho = require('../models/Despacho'); 
const Deposito = require('../models/Deposito'); 
const mongoose = require('mongoose'); // 🌟 IMPORTACIÓN CLAVE 🌟

const router = express.Router();

// 1. GET / (Obtener todos los despachos - PROTEGIDA)
router.get('/', protect, async (req, res) => {
    try {
        const { search } = req.query;
        const usuarioDepositosIds = req.user.depositosIds; 
        
        // Manejar el caso de que el usuario no tenga depósitos (devolver lista vacía)
        if (!usuarioDepositosIds || usuarioDepositosIds.length === 0) {
            return res.json([]);
        }

        // 🌟🌟🌟 CONVERSIÓN EXPLÍCITA DE IDs (Solución al fallo) 🌟🌟🌟
        const objectIdDepositos = usuarioDepositosIds.map(id => new mongoose.Types.ObjectId(id));

        let query = {};
        
        // 1. APLICAR FILTRO DE SEGURIDAD (POR DEPÓSITO ID)
        // Usamos los IDs convertidos
        query.deposito = { $in: objectIdDepositos };

        // 2. APLICAR FILTRO DE BÚSQUEDA (si existe)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { idNodo: searchRegex },
                { idReefer: searchRegex }
            ];
        }

        // 3. Ejecutar la consulta
        const despachos = await Despacho.find(query)
            .populate('deposito', 'nombre identificadorNodo') 
            .sort({ tServ: -1 })
            .limit(100);
            
        res.json(despachos);

    } catch (error) {
        console.error('Error al obtener despachos:', error);
        // Devolvemos el mensaje de error en el cuerpo para una mejor depuración en el navegador
        res.status(500).json({ 
            message: 'Error interno del servidor al obtener despachos.',
            details: error.message 
        });
    }
});

// 2. POST / (Recibir nuevo registro de despacho) - Mantengo la lógica original
router.post('/', async (req, res) => {
    try {
        const { identificadorNodo, idNodo, idReefer, tServ, ...otrosDatos } = req.body;

        const depositoEncontrado = await Deposito.findOne({ identificadorNodo });

        if (!depositoEncontrado) {
            return res.status(404).json({ message: `No se encontró un depósito asociado al nodo: ${identificadorNodo}` });
        }

        const nuevoDespacho = await Despacho.create({
            idNodo,
            idReefer,
            tServ,
            ...otrosDatos,
            deposito: depositoEncontrado._id 
        });

        res.status(201).json({ 
            message: "Despacho registrado con éxito.",
            despacho: nuevoDespacho
        });

    } catch (error) {
        console.error('Error al registrar despacho:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el despacho.' });
    }
});

module.exports = router;