const mongoose = require('mongoose');
const bcrypt = require('bcrypt')
const argon2= require('argon2');

const Schema= mongoose.Schema;

//creamos el schema para usuario con los campos:
//email de tipo string, obligatorio y unico en la base de datos
//password tipo string y requerido
// fileS de tipo array de ids de objetos de Files
let userSchema = new Schema({
	email: {
	    type: String,
	    required: true,
	    unique: true
	  },
	password: {
	    type: String,
	    required: true,
	    
	  },
    fileS: [{ type: Schema.Types.ObjectId, ref: 'Files' }]
});

//antes del guardado se ejecuta este bloque
userSchema.pre(
    'save',
     async function(next) {
        try {
            //si el usuario es nuevo en la base de datos guardamos su contraseña
            if(this.isNew){
                //la contraseña se encripta usando argon2id un sistema hibrido 
                this.password = await argon2.hash(this.password,{
                    type: argon2.argon2id,
                    memoryCost: 2 ** 16,
                    hashLength: 50,
                })
            }
            
            next()
        } catch (error) {
            next(error)
        }
    }
)

module.exports = mongoose.model('User', userSchema);