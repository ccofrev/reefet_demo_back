// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); 

const userSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password: { 
        type: String, 
        required: true 
    },
    nombre: { 
        type: String, 
        default: "Usuario" 
    }
});

// --- SOLUCIÓN ---
// Quitamos la palabra 'next' de los paréntesis y del código.
// Al ser 'async', Mongoose espera a que termine y listo.
userSchema.pre('save', async function() {
    // 1. Si no se modificó la clave, salimos (return simple)
    if (!this.isModified('password')) return;

    // 2. Encriptamos (Mongoose esperará a que esto termine automáticamente)
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);