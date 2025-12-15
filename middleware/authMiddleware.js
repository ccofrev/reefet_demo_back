// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    let token;

    // 1. Verificar si el token existe en el encabezado
    // El token se envía típicamente como: Authorization: Bearer <TOKEN_REAL>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraer el token (eliminar 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // 2. Verificar/Decodificar el token usando la clave secreta
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Si es válido, podemos pasar el ID del usuario al objeto de la solicitud (opcional)
            // req.user = await User.findById(decoded.id).select('-password');
            
            // Si todo está bien, pasamos al siguiente middleware/función (el controlador de la ruta)
            next();
        } catch (error) {
            console.error('Error en verificación de token:', error);
            // Si falla la verificación (token expirado o inválido)
            res.status(401).json({ message: 'Token no autorizado o expirado.' });
        }
    }

    if (!token) {
        // Si no se encuentra el token en la petición
        res.status(401).json({ message: 'No se encontró el token. Acceso denegado.' });
    }
};

module.exports = { protect };