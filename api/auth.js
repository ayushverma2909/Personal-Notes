import express from "express";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from 'passport-google-oauth2'
import path from 'path'
import { fileURLToPath } from 'url';

const app = express();
const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

const salting = 10;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use(passport.session());

router.get("/", (req, res) => {
  res.render("auth.ejs");
});

// router.post("/delete", (req, res) => {
  
// })

router.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;



  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);

    if (error) {
      console.error("Error checking email:", error);
      return res.status(500).render(path.join(__dirname, '../views/error.ejs'), {
        errorMessage: "Sorry for your inconvenience Please try again later..",
        buttonName: "Error",
        link: "#",
        click: "alert('Cannot go back return to homepage')"
      });
    }

    if (data.length > 0) {
      return res.status(400).render(path.join(__dirname, '../views/error.ejs'), {
        errorMessage: "Email Already exist try loggin in",
        buttonName: "Login",
        link: "/authuser",
        click: ""
      });
    }

    const hashedPassword = await bcrypt.hash(password, salting);

    const { error: insertError } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword, username }]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).render(path.join(__dirname, '../views/error.ejs'), {
        errorMessage: "Username already exist try using another Username",
        buttonName: "Go Back",
        link: "#",
        click: "window.history.back()"
      });
    }



    res.send("Signup successful. Please Login");
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).send("Error during signup.");
  }
});


router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).render(path.join(__dirname, '../views/error.ejs'), {
        errorMessage: "Internal Server Error. Please try again later.",
        buttonName: "Go Back",
        link: "#",
        click: "window.history.back()"
      });
    }
    
    if (!user) {
      // If login failed, pass the message from Passport
      return res.status(401).render(path.join(__dirname, '../views/error.ejs'), {
        errorMessage: info.message || "Invalid credentials. Please try again.",
        buttonName: "Go Back",
        link: "#",
        click: "window.history.back()"
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).render(path.join(__dirname, '../views/error.ejs'), {
          errorMessage: "Error during login. Please try again.",
          buttonName: "Go Back",
          link: "#",
          click: "window.history.back()"
        });
      }
      return res.redirect("/authuser/getnotes");
    });
  })(req, res, next);
});



router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback", 
  passport.authenticate("google", { failureRedirect: "/authuser" }),
  (req, res) => {
    res.redirect("/authuser/getnotes");
  }
);


router.get("/getnotes", async (req, res) => {
    if (req.isAuthenticated()) {
      const username = req.user.username;
    //   console.log(username)
  
      try {
        const { data, error } = await supabase
          .from("notes")
          .select("*")
          .eq("username", username);
  
        if (error) {
          console.error("Error fetching notes:", error);
          return res.status(500).send("Error fetching notes");
        }
  
        res.render("getdata.ejs", { data: data, username: username }); 
      } catch (err) {
        console.error("Server error:", err);
        res.status(500).send("Server error");
      }
  
    } else {
      res.redirect("/authuser");
    }
  });
  
  

router.get("/add", (req, res) => {
//   console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("postdata.ejs");
  } else {
    res.redirect("/authuser");
  }
});

passport.use(
  new Strategy({ usernameField: "email" },async function verify(email, password, cb) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email);
      if (error) {
        console.error("Error retrieving user:", error);
        return res.status(500).send("Error retrieving user data");
      }

      if (data.length > 0) {
        const user = data[0];

        bcrypt.compare(password, user.password, (err, valid) => {
          if (err) {
            console.log("Error comparing password ", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, user);
            } else {
              return cb(null, false, { message: "Incorrect password" });
            }
          }
        });
      } else {
        return cb(null, false, {message: "Email does not exist"})
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  })
);

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "http://localhost:3000/authuser/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", profile.emails[0].value);

    if (error) return done(error);

    if (data.length > 0) {
      return done(null, data[0]);
    } else {
      const { data: insertData, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            email: profile.emails[0].value,
            username: profile.displayName,
            password: "" // no password for Google users
          }
        ])
        .select("*");

      if (insertError) return done(insertError);

      return done(null, insertData[0]);
    }
  } catch (err) {
    return done(err);
  }
}));


passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

export default router;
