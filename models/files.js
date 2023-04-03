const mongoose = require('mongoose');

const Schema= mongoose.Schema;

//creamos un nuevo schema con los fields : 
//filename que es de tipo String , es un campo obligatorio y el valor debe ser unico en la base de datos
//isPrivate tipo boleano (verdadero o falso) y por defecto es verdadero
//description de tipo string y no es obligatorio
//clientName de tipo string y obligatorio
let fileSchema=new Schema({
    filename: {
	    type: String,
	    required: true,
	    unique: true
	  },
    isPrivate:{
        type: Boolean,
        default:true
    },
    description:{
        type: String,
        required: false
    },
    clientName:{
        type:String,
        required:true
    }
})

//exportamos para que otros archivos puedan usar el modelo
module.exports = mongoose.model('Files',fileSchema);