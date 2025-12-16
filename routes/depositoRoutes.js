// backend/routes/depositoRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Deposito = require('../models/Deposito'); 
const Empresa = require('../models/Empresa'); // Necesario para la verificación en POST

const router = express.Router();

// 1. POST / (Registrar Depósito)
router.post('/', protect, async (req, res) => {
    try {
        const { nombre, direccion, lat, lon, empresaId } = req.body;
        
        if (!nombre || !direccion || lat === undefined || lon === undefined || !empresaId) {
            return res.status(400).json({ message: 'Todos los campos, incluyendo el ID de la Empresa, son obligatorios.' });
        }

        // Opcional: Verificar que la Empresa ID existe
        const empresaExistente = await Empresa.findById(empresaId);
        if (!empresaExistente) {
            return res.status(404).json({ message: 'La Empresa seleccionada no existe.' });
        }
        
        const nuevoDeposito = new Deposito({ nombre, direccion, lat, lon, empresa: empresaId });
        await nuevoDeposito.save();
        
        // Devolver el nombre de la empresa para confirmación
        const depConEmpresa = await Deposito.findById(nuevoDeposito._id).populate('empresa', 'nombre');

        res.status(201).json({ 
            message: `Depósito ${nombre} registrado exitosamente y asociado a ${depConEmpresa.empresa.nombre}.`,
            deposito: nuevoDeposito
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ese nombre de Depósito ya ha sido registrado.' });
        }
        console.error('Error al registrar depósito:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el depósito.' });
    }
});

// 2. GET / (Obtener todos los Depósitos para SELECT)
router.get('/', protect, async (req, res) => {
    try {
        // Obtenemos solo el nombre y el ID, que es lo que necesitamos para el SELECT
        const depositos = await Deposito.find({}).select('nombre'); 
        res.json(depositos);
    } catch (error) {
        console.error('Error al obtener depósitos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener depósitos.' });
    }
});

module.exports = router;