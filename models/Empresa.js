// models/Empresa.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const empresaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        unique: true
    },
    rut: { // Registro Único Tributario o Identificador Fiscal
        type: String,
        required: true,
        unique: true
    },
    // Podrías añadir más campos aquí, como dirección o contacto.
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Empresa', empresaSchema);