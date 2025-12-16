// backend/routes/nodoRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Nodo = require('../models/Nodo'); 
const Deposito = require('../models/Deposito'); // Necesario para la verificación en POST

const router = express.Router();

// 1. POST / (Registrar Nodo)
router.post('/', protect, async (req, res) => {
    try {
        const { idNodo, depositoId } = req.body; 
        
        if (!idNodo || !depositoId) {
            return res.status(400).json({ message: 'El ID del Nodo y el ID del Depósito son obligatorios.' });
        }

        // Opcional: Verificar que el Depósito ID existe
        const depositoExistente = await Deposito.findById(depositoId);
        if (!depositoExistente) {
            return res.status(404).json({ message: 'El Depósito seleccionado no existe.' });
        }

        const nuevoNodo = new Nodo({ idNodo, deposito: depositoId }); // Usamos el ID
        await nuevoNodo.save();
        
        // Devolver el nodo con el nombre del depósito para confirmación
        const nodoConDeposito = await Nodo.findById(nuevoNodo._id).populate('deposito', 'nombre');
        
        res.status(201).json({ 
            message: `Nodo ${idNodo} registrado exitosamente y asociado a ${nodoConDeposito.deposito.nombre}.`,
            nodo: nuevoNodo
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ese ID de Nodo ya ha sido registrado.' });
        }
        console.error('Error al registrar nodo:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el nodo.' });
    }
});

// Nota: No tienes una ruta GET para listar Nodos en tu index.js original.
// Si necesitas listar Nodos, puedes añadirla aquí como router.get('/', protect, async...)

module.exports = router;