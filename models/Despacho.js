const mongoose = require('mongoose');

const despachoSchema = new mongoose.Schema({
    // Identificación del dispositivo (es la clave principal)
    idNodo: { 
        type: String, 
        required: true,
        trim: true,
        // Puedes ponerlo 'unique' si cada documento es un nodo único, 
        // o si cada registro es un "despacho" con el mismo nodo repetido.
        // Si se repite (lo más común en series de datos), quita 'unique'.
        // Lo dejaré sin 'unique' ya que es un registro de despacho.
    },
    
    // Identificación del contenedor refrigerado (Reefer)
    idReefer: { 
        type: String, 
        required: true, 
        trim: true 
    },

    // FECHAS (Usaremos el tipo Date para un manejo fácil en la base de datos)
    tServ: { // T. SERV. [UTC]
        type: Date, 
        required: true 
    },
    tNodo: { // T. NODO [UTC]
        type: Date, 
        required: true 
    },

    // Datos del equipo
    marca: { // MARCA (Carrier, TK, etc.)
        type: String, 
        trim: true,
        enum: ['Carrier', 'TK', 'Mitsubishi', 'Daikin', null] // Enum opcional
    },

    // Set Point (Temperatura configurada)
    sp: { // SP[°C]
        type: Number, 
        required: true 
    },

    // Software (Puede llevar letras, así que lo mantenemos como String)
    sw: { // SW (Software)
        type: String, 
        required: true, 
        trim: true
    },
    
    // Lugar de depósito/ubicación
    deposito: { // DEPOSITO
        type: String, 
        trim: true
    }
}, {
    timestamps: true // Esto añade 'createdAt' y 'updatedAt' automáticamente
});

// Esto creará una colección llamada 'despachos' en tu base de datos
module.exports = mongoose.model('Despacho', despachoSchema);