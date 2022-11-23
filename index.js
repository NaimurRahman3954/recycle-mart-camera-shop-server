const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 8000

const app = express()

//middleware
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.send("Doctor's Portal Node Server is running")
})

app.listen(port, () => {
  console.log(`Simple node server is running on port ${port}`)
})
