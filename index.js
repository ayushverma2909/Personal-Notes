import express from 'express'
import bodyParser from 'body-parser'
import authRoutes from './api/auth.js'
import postNotes from './api/post_notes.js'
import session from 'express-session'
import passport from 'passport'
import dotenv from 'dotenv'

const app = express()
const port = 3000
dotenv.config()

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 60 * 1000, // 30 minutes in milliseconds
    },
  })
);

app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: true }))


app.use(passport.initialize());
app.use(passport.session());

// const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)


app.use("/authuser", authRoutes) 

app.get("/", (req, res) => {
  res.render("home.ejs")
})

app.get("/logout", (req, res) => {
  req.logout(function (err) {
    if(err) {
      return next (err);
    }
    res.redirect("/");
  })
})


app.post("/submit_note", postNotes)

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`)
})
