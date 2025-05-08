import express from "express";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const router = express.Router();

dotenv.config();

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

router.post("/signup", async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email);
    if (error) {
      console.error("Error checking email:", error);
      return res.status(500).send("Error checking email");
    }
    if (data.length > 0) {
      return res.send("Email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, salting);
    const { error: insertError } = await supabase
      .from("users")
      .insert([{ email, password: hashedPassword, username }]);

    if (insertError) {
      console.error("Insert error:", insertError);
      return res.status(500).send("Error inserting data");
    }
    res.redirect("/authuser");
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).send("Error during signup");
  }
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/authuser/getnotes',
    failureRedirect: '/authuser',
}))

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
              return cb(null, false);
            }
          }
        });
      } else {
        return cb(null, false)
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

export default router;
