// models/Nodo.js
const mongoose = require('mongoose');

const nodoSchema = new mongoose.Schema({
    idNodo: {
        type: String,
        required: true,
        unique: true // Asegura que no haya dos nodos con el mismo ID
    },
    deposito: {
        type: String,
        required: true,
        // Aquí podríamos agregar una lista de depósitos válidos si fuera necesario
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Nodo', nodoSchema);