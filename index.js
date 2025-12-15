// backend/index.js
require('dotenv').config(); // Cargar variables de entorno
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const Nodo = require('./models/Nodo');
const Deposito = require('./models/Deposito');
const Empresa = require('./models/Empresa');
const Despacho = require('./models/Despacho');
const { protect } = require('./middleware/authMiddleware');


const app = express();
// 🌟 1. CONFIGURACIÓN ÚNICA DE CORS 🌟
// (Asegúrate de que esta sea la ÚNICA llamada a app.use(cors)
// y que uses tus dominios reales, ej. Vercel)
const allowedOrigins = [
    'http://localhost:5173', 
    'https://reefet-demo-front.vercel.app' // ¡Usar tu dominio real!
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

app.use(cors(corsOptions)); // 👈 Solo una vez, con la configuración de seguridad
// -------------------------------------------------------------
app.set('trust proxy', 1);

// 2. Conectar a Mongo
connectDB();

// 3. Otros Middlewares
// (Elimina la segunda llamada a app.use(cors) que tenías aquí)
app.use(express.json()); // Necesario para leer el cuerpo de las peticiones POST


// --- RUTAS DE AUTENTICACIÓN ---

// En tu backend/index.js

app.post('/api/register', async (req, res) => {
    try {
        // 1. LEER: Asegúrate de leer 'email' del body (NO username)
        const { email, password, empresaId, depositosIds, isAdmin, nombre } = req.body;

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
            nombre,
            isAdmin: isAdmin || false,
            empresa: empresaId, // Mapea el ID de entrada al campo 'empresa'
            depositos: depositosIds || [], 
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
        // 1. Extraemos EMAIL y password
        const { email, password } = req.body;

        // 2. Buscamos al usuario por su email
        const user = await User.findOne({ email });
        
        // 3. Verificamos si existe y si la contraseña coincide
        if (user && (await user.matchPassword(password))) {
            
            // 🌟🌟🌟 INICIO DEL AJUSTE CLAVE 🌟🌟🌟
            
            // 3a. Poblar las referencias: necesitamos los IDs de empresa y depósitos.
            const userPopulated = await User.findById(user._id)
                .populate('empresa', '_id nombre')    // Obtenemos el ID de la Empresa
                .populate('depositos', '_id nombre'); // Obtenemos el ID de los Depósitos

            // 3b. Determinar el payload para el token
            const payload = {
                id: userPopulated._id,
                email: userPopulated.email,
                isAdmin: userPopulated.isAdmin || false, // Aseguramos que sea un booleano
                
                // Incluir IDs de la empresa y los depósitos en el token para filtrado
                empresaId: userPopulated.empresa ? userPopulated.empresa._id : null,
                depositosIds: userPopulated.depositos ? userPopulated.depositos.map(dep => dep._id) : []
            };

            // 4. Generamos el token con el payload extendido
            const token = jwt.sign(
                payload, 
                process.env.JWT_SECRET, // Usa tu variable de entorno
                { expiresIn: '1d' }
            );
            
            // 🌟🌟🌟 FIN DEL AJUSTE CLAVE 🌟🌟🌟

            // 5. Enviamos la respuesta CORRECTA
            res.json({
                message: "Login exitoso",
                token: token,
                user: {
                    id: userPopulated._id,
                    nombre: userPopulated.nombre, 
                    email: userPopulated.email,
                    isAdmin: userPopulated.isAdmin || false,
                    // Opcional: Devolver los nombres para la interfaz
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
        // Obtenemos los IDs de depósito permitidos del token
        const usuarioDepositosIds = req.user.depositosIds; 
        
        let query = {};
        
        // 1. APLICAR FILTRO DE SEGURIDAD (POR DEPÓSITO ID)
        // El campo 'deposito' en Despacho es ahora un ObjectId.
        query.deposito = { $in: usuarioDepositosIds };

        // 2. APLICAR FILTRO DE BÚSQUEDA (si existe)
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Nota: Se busca en campos directos del Despacho
            query.$or = [
                { idNodo: searchRegex },
                { idReefer: searchRegex }
            ];
        }

        const despachos = await Despacho.find(query)
            .populate('deposito', 'nombre identificadorNodo') // 👈 🌟 ESTO ES CLAVE 🌟
            .sort({ tServ: -1 })
            .limit(100);
        
        // El resultado ahora tendrá: despacho.deposito.nombre

        res.json(despachos);

    } catch (error) {
        console.error('Error al obtener despachos:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Ruta POST para recibir un nuevo registro de despacho
app.post('/api/despachos', async (req, res) => {
    try {
        // Asumo que el registro entrante incluye 'identificadorNodo'
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
            deposito: depositoEncontrado._id // 👈 Guardamos la referencia ID
        });

        res.status(201).json({ 
            message: "Despacho registrado con éxito.",
            despacho: nuevoDespacho
        });

    } catch (error) {
        console.error('Error al registrar despacho:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

app.post('/api/nodos', protect, async (req, res) => {
    try {
        // Esperamos recibir el ID del Depósito
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
        
        // Opcional: Devolver el nodo con el nombre del depósito para confirmación
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

// index.js (Backend) - Ruta POST /api/depositos
app.post('/api/depositos', protect, async (req, res) => {
    try {
        // Esperamos recibir el ID de la empresa
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

// 🌟 RUTA 2: GET para Obtener todos los Depósitos (para el SELECT) 🌟
app.get('/api/depositos', protect, async (req, res) => {
    try {
        // Obtenemos solo el nombre y el ID, que es lo que necesitamos para el SELECT
        const depositos = await Deposito.find({}).select('nombre'); 
        res.json(depositos);
    } catch (error) {
        console.error('Error al obtener depósitos:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener depósitos.' });
    }
});

app.post('/api/empresas', protect, async (req, res) => {
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

// 🌟 RUTA 2: GET para Obtener todas las Empresas (para SELECT) 🌟
app.get('/api/empresas', protect, async (req, res) => {
    try {
        // Obtenemos solo el nombre y el ID
        const empresas = await Empresa.find({}).select('nombre'); 
        res.json(empresas);
    } catch (error) {
        console.error('Error al obtener empresas:', error);
        res.status(500).json({ message: 'Error interno del servidor al obtener empresas.' });
    }
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));