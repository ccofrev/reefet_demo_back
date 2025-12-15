// models/Deposito.js (AJUSTADO PARA REFERENCIAR EMPRESA)
const mongoose = require('mongoose');
const { Schema } = mongoose;

const depositoSchema = new Schema({
    nombre: {
        type: String,
        required: true,
        unique: true
    },
    direccion: {
        type: String,
        required: true
    },
    lat: {
        type: Number,
        required: true
    },
    lon: {
        type: Number,
        required: true
    },
    // 🌟 NUEVA REFERENCIA: ENLACE A EMPRESA 🌟
    empresa: { 
        type: Schema.Types.ObjectId, 
        ref: 'Empresa', 
        required: true
    },

    identificadorNodo: { 
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Deposito', depositoSchema);