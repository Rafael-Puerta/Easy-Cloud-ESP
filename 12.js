const express = require('express')
const Parser = require('body-parser')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser');
const path= require('path')


const enrout=require('./routes/auth-routes');
const protectedRoutes=require('./routes/protected-routes');
const authViews=require('./routes/auth-views.js');
const views=require('./routes/views');

mongoose.connect("mongodb://localhost:27017/easy-cloud")

const app = express()

app.use(cookieParser());
app.use(Parser.urlencoded({ extended: true }))
//creamos las vistas para acceder a ellas muy facilmente para hacerles renders
app.set('views', './views');
app.engine('.html', require('ejs').__express);
app.set('view engine', 'html');

//hacemos estaticas las rutas siguientes para acceder a ellas mas facilmente
app.use(
  express.static(path.join(__dirname,"node_modules", "bootstrap","dist"))
);

app.use(express.static(path.join(__dirname,"node_modules", "jquery","dist")))

app.use(express.static(path.join(__dirname,"node_modules", "bootstrap-icons")))

app.use((req, res,next) => {
     
    console.log("Ruta: "+req.url)
    next()
    
  })
  
app.use('/auth/api',enrout)
app.use('/auth',authViews)
app.use('/api',protectedRoutes)
app.use('/',views)

app.all("*", (req,res)=>{
    res.sendStatus(501) // codigo de estatus no implementado
})

app.listen(3000)