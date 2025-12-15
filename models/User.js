// models/User.js (AJUSTADO PARA PERMISOS Y AUTENTICACIÓN)
const mongoose = require('mongoose');
const { Schema } = mongoose;
const bcrypt = require('bcryptjs'); // <-- ¡Necesario para hashear y comparar!

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin: { 
        type: Boolean,
        default: false
    },
    // Nuevos campos de relación
    empresa: {
        type: Schema.Types.ObjectId,
        ref: 'Empresa',
        required: function() { return !this.isAdmin; } 
    },
    depositos: [{ 
        type: Schema.Types.ObjectId,
        ref: 'Deposito'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// 🌟🌟🌟 AJUSTE 1: Método para Comparar Contraseñas 🌟🌟🌟
// Esto hace que user.matchPassword sea una función válida.
userSchema.methods.matchPassword = async function (enteredPassword) {
    // Compara la contraseña de entrada (enteredPassword) con la contraseña hasheada guardada (this.password)
    return await bcrypt.compare(enteredPassword, this.password);
};


// 🌟🌟🌟 AJUSTE 2: Middleware para Hashear ANTES de Guardar 🌟🌟🌟
userSchema.pre('save', async function () { // 👈 Eliminamos 'next' de los parámetros
    
    // Solo hasheamos si la contraseña fue modificada
    if (!this.isModified('password')) {
        return; // Usamos 'return' en lugar de 'next()'
    }
    
    // Hasheamos la nueva contraseña
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // Ya no es necesario llamar a next() al final. La función terminará y Mongoose continuará.
});


module.exports = mongoose.model('User', userSchema);