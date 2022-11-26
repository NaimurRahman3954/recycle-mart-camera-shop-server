const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const port = process.env.PORT || 8000

const app = express()

//middleware
app.use(cors())
app.use(express.json())

app.get('/', async (req, res) => {
  res.send("Doctor's Portal Node Server is running")
})

// mongoDB-----------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.xtspvzn.mongodb.net/?retryWrites=true&w=majority`

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

async function run() {
  try {
    const categoriesCollection = client
      .db('RecycleMart')
      .collection('CameraCategories')
    const bookingsCollection = client.db('RecycleMart').collection('bookings')
    const wishlistsCollection = client.db('RecycleMart').collection('wishlists')

    app.get('/categories', async (req, res) => {
      const cursor = categoriesCollection.find({})
      const categories = await cursor.toArray()
      res.send(categories)
    })

    app.get('/categories/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const category = await categoriesCollection.findOne(query)
      res.send(category)
    })

    app.get('/bookings', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const cursor = bookingsCollection.find(query)
      const bookings = await cursor.toArray()
      res.send(bookings)
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body

      // const query = {
      //   appointmentDate: booking.appointmentDate,
      //   email: booking.email,
      //   treatment: booking.treatment,
      // }

      // const alreadyBooked = await bookingsCollection.find(query).toArray()

      // if (alreadyBooked.length) {
      //   const message = `You already have a booking on ${booking.appointmentDate}`
      //   return res.send({ acknowledged: false, message })
      // }

      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })

    app.get('/wishlists', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const cursor = wishlistsCollection.find(query)
      const wishlists = await cursor.toArray()
      res.send(wishlists)
    })

    app.post('/wishlists', async (req, res) => {
      const wishlist = req.body
      const result = await wishlistsCollection.insertOne(wishlist)
      res.send(result)
    })
  } finally {
  }
}
run().catch((err) => console.error(err))

// -------------------

app.listen(port, () => {
  console.log(`Simple node server is running on port ${port}`)
})
