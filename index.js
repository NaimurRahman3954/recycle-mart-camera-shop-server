const express = require('express')
const jwt = require('jsonwebtoken')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const port = process.env.PORT || 8000
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

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

function verifyJWT(req, res, next) {
  // console.log('token inside JTW', req.headers.authorization)
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).send('unauthorized access')
  }

  const token = authHeader.split(' ')[1]

  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    const categoriesCollection = client
      .db('RecycleMart')
      .collection('CameraCategories')
    const bookingsCollection = client.db('RecycleMart').collection('bookings')
    const wishlistsCollection = client.db('RecycleMart').collection('wishlists')
    const usersCollection = client.db('RecycleMart').collection('users')
    const productsCollection = client.db('RecycleMart').collection('products')
    const paymentsCollection = client.db('RecycleMart').collection('payments')

    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email
      const query = { email: decodedEmail }
      const user = await usersCollection.findOne(query)

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }

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

    // app.get('/bookings', verifyJWT, verifyAdmin, async (req, res) => {
    //   const email = req.query.email
    //   const query = { email: email }
    //   const cursor = bookingsCollection.find(query)
    //   const bookings = await cursor.toArray()
    //   res.send(bookings)
    // })

    // 🛑 403 dekhacche
    app.get('/bookings', verifyJWT, async (req, res) => {
      const email = req.query.email
      const decodedEmail = req.decoded.email
      console.log(decodedEmail)

      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ message: 'forbidden access', decodedEmail })
      }

      const query = { email: email }
      const bookings = await bookingsCollection.find(query).toArray()
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

    app.get('/bookings/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: ObjectId(id) }
      const booking = await bookingsCollection.findOne(query)
      res.send(booking)
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

    app.post('/create-payment-intent', async (req, res) => {
      const booking = req.body
      const price = booking.price
      const amount = price * 100

      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'bdt',
        amount: amount,
        payment_method_types: ['card'],
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    app.post('/payments', async (req, res) => {
      const payment = req.body
      const result = await paymentsCollection.insertOne(payment)
      const id = payment.bookingId
      const filter = { _id: ObjectId(id) }
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      }
      const updatedResult = await bookingsCollection.updateOne(
        filter,
        updatedDoc
      )
      res.send(result)
    })

    app.get('/jwt', async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      // console.log(user)
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: '1d',
        })
        return res.send({ accessToken: token })
      }
      res.status(403).send({ accessToken: '' })
    })

    app.get('/users', async (req, res) => {
      const query = {}
      const users = await usersCollection.find(query).toArray()
      res.send(users)
    })

    app.post('/users', async (req, res) => {
      const user = req.body
      console.log(user)
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email
      const query = { email }
      const user = await usersCollection.findOne(query)
      res.send({ isAdmin: user?.role === 'admin' })
    })

    app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const decodedEmail = req.decoded.email
      const query = { email: decodedEmail }
      console.log(query)
      const user = await usersCollection.findOne(query)

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'forbidden access' })
      }

      const id = req.params.id
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true }
      const updatedDoc = {
        $set: {
          role: 'admin',
        },
      }
      const result = await usersCollection.updateOne(
        filter,
        updatedDoc,
        options
      )
      res.send(result)
    })

    // 🛑 verifyJWT, verifyAdmin remove korle 403 dekhacche na
    app.get('/products', verifyJWT, verifyAdmin, async (req, res) => {
      const query = {}
      const products = await productsCollection.find(query).toArray()
      res.send(products)
    })

    app.post('/products', verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body
      const result = await productsCollection.insertOne(product)
      res.send(result)
    })

    app.delete('/products/:id', verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: ObjectId(id) }
      const result = await productsCollection.deleteOne(filter)
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
