// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta: /api/auth/registro
router.post('/registro', authController.registro);

// Ruta: /api/auth/login
router.post('/login', authController.login);

module.exports = router;