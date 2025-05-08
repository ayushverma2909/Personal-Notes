import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

const GetNotes = async (req, res) => {
  try {
    const { data, error } = await supabase.from('notes').select('*')
    if (error) throw error
    res.render('getdata.ejs', { data })
  } catch (err) {
    res.status(500).send('Error fetching notes: ' + err.message)
  }
}

export default GetNotes
