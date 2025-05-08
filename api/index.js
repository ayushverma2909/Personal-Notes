import express from 'express'
import bodyParser from 'body-parser'
import authRoutes from './auth.js'
import postNotes from './post_notes.js'
import session from 'express-session'
import passport from 'passport'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'


dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

app.set('views', path.join(__dirname, '../views'))  // point to your views folder
app.set('view engine', 'ejs')

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'default_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 60 * 1000,
    },
  })
)

app.use(express.static(path.join(__dirname, '../public')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(passport.initialize())
app.use(passport.session())

app.use("/authuser", authRoutes)

app.get("/", (req, res) => {
  res.render("home.ejs")
})

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if (err) return next(err)
    res.redirect("/")
  })
})

app.post("/submit_note", postNotes)

export default app
