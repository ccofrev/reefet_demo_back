// backend/middleware/authMiddleware.js (FINAL Y FUNCIONAL)
const jwt = require('jsonwebtoken');

// IMPORTANTE: Asegúrate de que process.env.JWT_SECRET esté cargado correctamente
// (Revisa el archivo .env)

const protect = (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar/Decodificar el token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // 🌟🌟🌟 AJUSTE CRÍTICO 🌟🌟🌟
            // 3. Adjuntar el payload del token (incluyendo IDs de permisos) a la solicitud
            // Esto permite que el controlador de la ruta (e.g., /api/despachos) acceda a: 
            // req.user.depositosIds y req.user.empresaId
            req.user = decoded;
            
            // 🌟🌟🌟 FIN AJUSTE CRÍTICO 🌟🌟🌟

            next(); // Continuar
        } catch (error) {
            console.error('Error en verificación de token:', error);
            // Si falla la verificación (token expirado o inválido)
            return res.status(401).json({ message: 'Token no autorizado o expirado.' });
        }
    } else {
        // Si no se encuentra el token en la petición
        return res.status(401).json({ message: 'No se encontró el token. Acceso denegado.' });
    }
};

module.exports = { protect };