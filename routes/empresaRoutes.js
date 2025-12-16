// backend/routes/empresaRoutes.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const Empresa = require('../models/Empresa'); 

const router = express.Router();

// 1. POST / (Registrar Empresa)
router.post('/', protect, async (req, res) => {
    try {
        const { nombre, rut } = req.body;
        
        if (!nombre || !rut) {
            return res.status(400).json({ message: 'El nombre y el RUT de la empresa son obligatorios.' });
        }

        const nuevaEmpresa = new Empresa({ nombre, rut });
        await nuevaEmpresa.save();
        
        res.status(201).json({ 
            message: 'Empresa registrada exitosamente.',
            empresa: nuevaEmpresa
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Esa Empresa o RUT ya existe.' });
        }
        console.error('Error al registrar empresa:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// 2. GET / (Obtener todas las Empresas para SELECT)
router.get('/', protect, async (req, res) => {
    try {
        // Obtenemos solo el nombre y el ID
        const empresas = await Empresa.find({}).select('nombre'); 
        res.json(empresas);
    } catch (error) {
        console.error('Error al obtener empresas:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener empresas.' });
    }
});

module.exports = router;