import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import bodyParser from 'body-parser'
import express from 'express'

dotenv.config()

const app = express()

app.use(bodyParser.urlencoded({extended:true}))
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const postNotes = async (req, res) => {
  const { title, content } = req.body
  if (!req.isAuthenticated()) {
    return res.status(401).send("Not logged in");
  }

  const username = req.user.username;
  const { data, error } = await supabase .from('notes') .insert([{ username, title, content }])

  if (error) {
    console.error('Insert error:', error)
    return res.status(500).send('Error inserting data')
  }

  res.redirect('/authuser/getnotes')
}

export default postNotes
