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
        // La información del token (req.user) viene del middleware 'protect'
        const usuarioDepositosIds = req.user.depositosIds; 
        
        // Si el usuario no tiene depósitos asignados, devolvemos una lista vacía
        if (!usuarioDepositosIds || usuarioDepositosIds.length === 0) {
            return res.json([]);
        }

        let query = {};
        
        // 1. APLICAR FILTRO DE SEGURIDAD (POR DEPÓSITO ID)
        // Solo busca despachos cuyos IDs de depósito estén en la lista permitida del usuario
        query.deposito = { $in: usuarioDepositosIds };

        // 2. APLICAR FILTRO DE BÚSQUEDA (si existe)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                // Busca en campos directos del Despacho
                { idNodo: searchRegex },
                { idReefer: searchRegex }
            ];
        }

        // 3. Ejecutar la consulta con población
        const despachos = await Despacho.find(query)
            .populate('deposito', 'nombre identificadorNodo') // Traemos el nombre del depósito asociado
            .sort({ tServ: -1 })
            .limit(100);
            
        res.json(despachos);

    } catch (error) {
        console.error('Error al obtener despachos:', error);
        // Devuelve un error 500 para indicar al frontend que algo falló en el backend
        res.status(500).json({ message: 'Error interno del servidor al obtener despachos.' });
    }
});

// 2. POST / (Recibir nuevo registro de despacho - RUTA DE IOT, NO PROTEGIDA)
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
            deposito: depositoEncontrado._id // Guardamos la referencia ID
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