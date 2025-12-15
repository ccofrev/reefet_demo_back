// backend/index.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const { protect } = require('./middleware/authMiddleware');
const Despacho = require('./models/Despacho');
const Nodo = require('./models/Nodo');


const app = express();
app.use(cors()); // <--- ¡Esto permite que el Frontend se conecte!

// 1. Conectar a Mongo
connectDB();

// 2. Middlewares
app.use(cors());
app.use(express.json());


// --- RUTAS DE AUTENTICACIÓN ---

// En tu backend/index.js

app.post('/api/register', async (req, res) => {
    try {
        // 1. LEER: Asegúrate de leer 'email' del body (NO username)
        const { email, password, nombre } = req.body;

        // 2. VALIDAR: Buscar si existe por email
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'El usuario ya existe' });
        }

        // 3. CREAR: Pasamos el objeto con 'email'
        // Crear usuario
        const user = await User.create({ 
            email, 
            password, 
            nombre 
        });

        res.status(201).json({ 
        message: 'Usuario creado', 
        user: { 
            id: user._id, 
            email: user.email,
            nombre: user.nombre  // <--- ¡AGREGA ESTA LÍNEA!
            } 
        });
    } catch (error) {
        console.error(error); // Esto imprime el error real en tu terminal
        // Truco: enviamos error.message para que Postman no muestre {} vacío
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
});

// B. LOGIN REAL (Corregido para usar Email)
app.post('/api/login', async (req, res) => {
    try {
        // 1. Extraemos EMAIL y password (antes era username)
        const { email, password } = req.body;

        // 2. Buscamos al usuario por su email
        const user = await User.findOne({ email });
        
        // 3. Verificamos si existe y si la contraseña coincide
        if (user && (await user.matchPassword(password))) {
            
            // 4. Generamos el token
            const token = jwt.sign(
                { id: user._id }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1d' }
            );

            // 5. Enviamos la respuesta CORRECTA
            res.json({
                message: "Login exitoso",
                token: token,
                user: {
                    id: user._id,
                    nombre: user.nombre,
                    email: user.email // Devolvemos email, no username
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

// --- TUS OTRAS RUTAS ---

// Mantengo tu MOCK_DATA para la tabla por ahora, 
// luego podemos reemplazar esto con un modelo de 'Pedidos' en Mongo.
const MOCK_DATA = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    cliente: `Cliente Empresa ${i + 1}`,
    estado: i % 3 === 0 ? 'Pendiente' : i % 2 === 0 ? 'Completado' : 'En Proceso',
    monto: Math.floor(Math.random() * 10000),
    fecha: new Date().toLocaleDateString()
}));

app.get('/api/data', (req, res) => {
    // Eventualmente aquí harás: const data = await Pedido.find();
    res.json(MOCK_DATA);
});


// Ruta GET para obtener todos los despachos (¡AHORA PROTEGIDA!)
// El middleware 'protect' se ejecuta primero. Si el token es inválido, detiene la ejecución.
app.get('/api/despachos', protect, async (req, res) => {
    try {
        const { search } = req.query; 
        let filter = {}; // 1. CRÍTICO: Inicializar el filtro como vacío

        // 2. CRÍTICO: Solo aplicar la lógica $or/$regex si 'search' tiene contenido útil
        if (search && search.trim() !== '') { 
            filter = {
                $or: [
                    // Asegúrate de que los nombres de los campos (idNodo, idReefer, etc.) sean exactos
                    { idNodo: { $regex: search, $options: 'i' } },
                    { idReefer: { $regex: search, $options: 'i' } },
                    { deposito: { $regex: search, $options: 'i' } },
                ]
            };
        }
        
        // Si 'search' está vacío o nulo, Mongoose ejecutará Despacho.find({}) 
        // y devolverá todos los documentos.
        const despachos = await Despacho.find(filter).sort({ tServ: -1 }); 
        
        res.json(despachos);
    } catch (error) {
        console.error('Error al obtener despachos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
});

// Ruta POST para recibir un nuevo registro de despacho
app.post('/api/despachos', async (req, res) => {
    try {
        // Asumimos que el body de la petición tiene los campos que definimos:
        const newDespacho = await Despacho.create(req.body);

        res.status(201).json({ 
            message: 'Registro de despacho creado con éxito', 
            data: newDespacho 
        });
    } catch (error) {
        console.error('Error al crear despacho:', error);
        // Devolvemos un error 400 si los datos requeridos no se envían
        res.status(400).json({ message: 'Datos de despacho incompletos o inválidos', error: error.message });
    }
});

// RUTA PARA REGISTRAR UN NUEVO NODO (POST /api/nodos)
app.post('/api/nodos', protect, async (req, res) => {
    try {
        const { idNodo, deposito } = req.body;
        
        // Verificación básica de que los campos no están vacíos
        if (!idNodo || !deposito) {
            return res.status(400).json({ message: 'El ID del Nodo y el Depósito son obligatorios.' });
        }

        const nuevoNodo = new Nodo({ idNodo, deposito });
        await nuevoNodo.save();
        
        res.status(201).json({ 
            message: 'Nodo registrado exitosamente.',
            nodo: nuevoNodo
        });
        
    } catch (error) {
        // Error de duplicidad (código 11000)
        if (error.code === 11000) {
            return res.status(409).json({ message: 'Ese ID de Nodo ya ha sido registrado.' });
        }
        console.error('Error al registrar nodo:', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el nodo.' });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));