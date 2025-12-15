// controllers/authController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Función auxiliar para crear Token
const generarToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// 1. REGISTRO (Para crear el primer usuario en tu BD)
exports.registro = async (req, res) => {
    const { email, password, nombre } = req.body;

    try {
        // Verificar si ya existe
        let usuario = await User.findOne({ email });
        if (usuario) {
            return res.status(400).json({ msg: 'El usuario ya existe' });
        }

        // Crear nuevo usuario
        usuario = new User({ email, password, nombre });
        
        // Al guardar, se activa automáticamente el hash del modelo
        await usuario.save();

        res.status(201).json({ msg: 'Usuario creado exitosamente' });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};

// 2. LOGIN (Lo que pediste)
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // A. Buscar usuario por email
        const usuario = await User.findOne({ email });
        if (!usuario) {
            return res.status(400).json({ msg: 'Credenciales inválidas (Usuario no encontrado)' });
        }

        // B. Verificar password usando el método que creamos en el modelo
        const esCorrecto = await usuario.compararPassword(password);
        if (!esCorrecto) {
            return res.status(400).json({ msg: 'Credenciales inválidas (Password incorrecto)' });
        }

        // C. Generar Token y devolver datos
        const token = generarToken(usuario._id);

        res.json({
            msg: 'Login exitoso',
            token: token,
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email
            }
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ msg: 'Error en el servidor' });
    }
};