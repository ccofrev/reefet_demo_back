// backend/index.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const jwt = require('jsonwebtoken'); // Necesario para el login
const User = require('./models/User'); // Necesario para el login/register
const { protect } = require('./middleware/authMiddleware'); // Necesario para proteger rutas

// 🌟🌟🌟 1. IMPORTACIÓN DE MÓDULOS DE RUTAS 🌟🌟🌟
const empresaRoutes = require('./routes/empresaRoutes');
const depositoRoutes = require('./routes/depositoRoutes');
const nodoRoutes = require('./routes/nodoRoutes');
const despachoRoutes = require('./routes/despachoRoutes');
// 🌟🌟🌟 FIN IMPORTACIÓN 🌟🌟🌟


const app = express();

// 🌟 2. CONFIGURACIÓN CORS (ÚNICA) 🌟
const allowedOrigins = [
    'http://localhost:5173', 
    'https://reefet-demo-front.vercel.app' 
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) return callback(null, true); 
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`CORS: Origen no permitido: ${origin}`);
            callback(new Error('No permitido por CORS'));
        }
    }
};

app.use(cors(corsOptions)); 

// 🌟 3. CONFIGURACIÓN DE PROXY (CLAVE para Nginx/HTTPS) 🌟
app.set('trust proxy', 1);

// 4. Conectar a Mongo
connectDB();

// 5. Middlewares principales
app.use(express.json()); // Necesario para leer el cuerpo de las peticiones POST


// 🌟🌟🌟 6. REGISTRO DE RUTAS MODULARES 🌟🌟🌟
// Las rutas /api/empresas, /api/depositos, etc., apuntan ahora a sus respectivos archivos.
app.use('/api/empresas', empresaRoutes);
app.use('/api/depositos', depositoRoutes);
app.use('/api/nodos', nodoRoutes);
app.use('/api/despachos', despachoRoutes);
// 🌟🌟🌟 FIN REGISTRO DE RUTAS MODULARES 🌟🌟🌟


// --- 7. RUTAS DE AUTENTICACIÓN (Se mantienen aquí para centralizar el acceso) ---

// A. REGISTER
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, empresaId, depositosIds, isAdmin, nombre } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        const user = await User.create({ 
            email, 
            password, 
            nombre,
            isAdmin: isAdmin || false,
            empresa: empresaId, 
            depositos: depositosIds || [], 
        });

        res.status(201).json({ 
        message: 'Usuario creado', 
        user: { 
            id: user._id, 
            email: user.email,
            nombre: user.nombre 
            } 
        });
    } catch (error) {
        console.error(error); 
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// B. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (user && (await user.matchPassword(password))) {
            
            const userPopulated = await User.findById(user._id)
                .populate('empresa', '_id nombre') 
                .populate('depositos', '_id nombre');

            const payload = {
                id: userPopulated._id,
                email: userPopulated.email,
                isAdmin: userPopulated.isAdmin || false, 
                
                empresaId: userPopulated.empresa ? userPopulated.empresa._id : null,
                depositosIds: userPopulated.depositos ? userPopulated.depositos.map(dep => dep._id) : []
            };

            const token = jwt.sign(
                payload, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );
            
            res.json({
                message: "Login exitoso",
                token: token,
                user: {
                    id: userPopulated._id,
                    nombre: userPopulated.nombre, 
                    email: userPopulated.email,
                    isAdmin: userPopulated.isAdmin || false,
                    empresa: userPopulated.empresa ? userPopulated.empresa.nombre : null,
                    depositos: userPopulated.depositos ? userPopulated.depositos.map(dep => dep.nombre) : []
                }
            });
        } else {
            res.status(401).json({ message: 'Credenciales inválidas' });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error en el servidor' });
    }
});


// --- 8. OTRAS RUTAS ÚNICAS ---

// Ruta MOCK DATA (Se mantiene aquí ya que es simple)
const MOCK_DATA = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    cliente: `Cliente Empresa ${i + 1}`,
    estado: i % 3 === 0 ? 'Pendiente' : i % 2 === 0 ? 'Completado' : 'En Proceso',
    monto: Math.floor(Math.random() * 10000),
    fecha: new Date().toLocaleDateString()
}));

app.get('/api/data', (req, res) => {
    res.json(MOCK_DATA);
});


// --- 9. INICIO DEL SERVIDOR ---

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));