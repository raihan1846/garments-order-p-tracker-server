// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = "mongodb+srv://garmentsOPdb:8VlTG3cHxcjUOgYG@garmentsorderproduction.znkdhhx.mongodb.net/?appName=garmentsorderproduction";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect to DB
async function run() {
  try {
    await client.connect();
    const db = client.db('garments_order_productions');
    const productCollection = db.collection('products');
    const userCollection = db.collection('users');
    const orderCollection = db.collection('orders');

    console.log("Connected to MongoDB");

    /** ------------------- PRODUCTS ------------------- **/

    app.get('/products', async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    app.get('/products/:id', async (req, res) => {
      try {
        const product = await productCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!product) return res.status(404).send({ message: "Product not found" });
        res.send(product);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    app.post('/products', async (req, res) => {
      const result = await productCollection.insertOne(req.body);
      res.send(result);
    });

    app.put('/products/:id', async (req, res) => {
      try {
        const result = await productCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        if (result.matchedCount === 0) return res.status(404).send({ message: "Product not found" });
        res.send({ message: "Product updated", result });
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    app.delete('/products/:id', async (req, res) => {
      try {
        const result = await productCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        if (result.deletedCount === 0) return res.status(404).send({ message: "Product not found" });
        res.send({ message: "Product deleted" });
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    /** ------------------- USERS ------------------- **/

    // GET users (all or by email query)
    app.get('/users', async (req, res) => {
      try {
        const { email } = req.query;
        const query = email ? { email: email.toLowerCase() } : {};
        const users = await userCollection.find(query).toArray();
        res.send(users);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // GET single user by ID
    app.get('/users/:id', async (req, res) => {
      try {
        const user = await userCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!user) return res.status(404).send({ message: 'User not found' });
        res.send(user);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // GET user by Firebase UID
    app.get('/users/firebase/:uid', async (req, res) => {
      try {
        const user = await userCollection.findOne({ firebaseUid: req.params.uid });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user); // role সহ সব data
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    // POST new user (social login or normal)
    app.post('/users', async (req, res) => {
      try {
        const newUser = req.body;
        newUser.email = newUser.email.toLowerCase();

        const existingUser = await userCollection.findOne({ email: newUser.email });
        if (existingUser) return res.status(409).send({ message: "User already exists" });

        const result = await userCollection.insertOne(newUser);
        res.send(result);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
      }
    });

    // UPDATE user role/status
    app.put('/users/:id', async (req, res) => {
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: req.body }
        );
        res.send(result);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // DELETE user
    app.delete('/users/:id', async (req, res) => {
      try {
        const result = await userCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // POST login
    app.post('/login', async (req, res) => {
      try {
        const { email, password } = req.body;
        const user = await userCollection.findOne({ email: email.toLowerCase() });

        if (!user) return res.status(401).send({ message: "User not found" });
        if (user.status === "suspended") return res.status(403).send({ message: `Account suspended: ${user.suspendFeedback}` });
        if (password !== user.password) return res.status(401).send({ message: "Incorrect password" });

        res.send({ message: "Login successful", user });
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    /** ------------------- ORDERS ------------------- **/

    app.get('/orders', async (req, res) => {
      const orders = await orderCollection.find().toArray();
      res.send(orders);
    });

      // pending orders
    app.get("/orders/pending", async (req, res) => {
      const orders = await orderCollection
        .find({ status: "pending" })
        .toArray();
      res.send(orders);
    });

    // approved orders
    app.get("/orders/approved", async (req, res) => {
      const orders = await orderCollection
        .find({ status: "approved" })
        .toArray();
      res.send(orders);
    });



    app.get('/orders/user/:userId', async (req, res) => {
      const orders = await orderCollection.find({ userId: req.params.userId }).toArray();
      res.send(orders);
    });

    app.get('/orders/:id', async (req, res) => {
      try {
        const order = await orderCollection.findOne({ _id: new ObjectId(req.params.id) });
        if (!order) return res.status(404).send({ message: "Order not found" });
        res.send(order);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    app.post('/orders', async (req, res) => {
      const newOrder = { ...req.body, status: 'pending', tracking: [] };
      const result = await orderCollection.insertOne(newOrder);
      res.send(result);
    });

    app.put('/orders/:id', async (req, res) => {
      const { status, approvedAt } = req.body;
      const result = await orderCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: { status, approvedAt: approvedAt || null } }
      );
      res.send(result);
    });

  app.get('/products/orders/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
        if (!order) return res.status(404).send({ message: "Order not found" });
        res.send(order);
      } catch (err) {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    app.patch("/orders/:id/tracking", async (req, res) => {
        const { id } = req.params;
        const trackingData = req.body;

        const result = await orderCollection.updateOne(
          { _id: new ObjectId(id) },
          {
            $push: {
              tracking: {
                ...trackingData,
                createdAt: new Date()
              }
            }
          }
        );

        res.send(result);
      });

    app.put('/orders/tracking/:id', async (req, res) => {
      const trackingUpdate = req.body; // { status, location, note, date }
      const result = await orderCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $push: { tracking: trackingUpdate } }
      );
      res.send(result);
    });

    app.delete('/orders/:id', async (req, res) => {
      try {
        const result = await orderCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.send(result);
      } catch {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

  } finally {
    // DB connection stays open for API
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send('Server is running...'));
app.listen(port, () => console.log(`Server running on port ${port}`));
