// models/Nodo.js (AJUSTADO PARA REFERENCIA)
const mongoose = require('mongoose');
const { Schema } = mongoose; // Importamos Schema para las referencias

const nodoSchema = new Schema({
    idNodo: {
        type: String,
        required: true,
        unique: true 
    },
    deposito: {
        // 🌟 CRÍTICO: Referencia al Depósito por su ID 🌟
        type: Schema.Types.ObjectId, 
        ref: 'Deposito', // Nombre del modelo al que hace referencia
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Nodo', nodoSchema);