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

    console.log("Connected to MongoDB");

    // GET all products
    app.get('/products', async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    // GET single product by ID
    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const product = await productCollection.findOne({ _id: new ObjectId(id) });
        if (!product) return res.status(404).send({ message: "Product not found" });
        res.send(product);
      } catch (err) {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // CREATE product
    app.post('/products', async (req, res) => {
      const newProduct = req.body;
      const result = await productCollection.insertOne(newProduct);
      res.send(result);
    });

    // UPDATE product by ID
    app.put('/products/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      try {
        const result = await productCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );
        if (result.matchedCount === 0) return res.status(404).send({ message: "Product not found" });
        res.send({ message: "Product updated", result });
      } catch (err) {
        res.status(400).send({ message: "Invalid ID" });
      }
    });

    // DELETE product by ID
    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await productCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).send({ message: "Product not found" });
        res.send({ message: "Product deleted" });
      } catch (err) {
        res.status(400).send({ message: "Invalid ID" });
      }
    });


    // user part

// GET users by email
app.get('/users', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).send({ message: "Email query missing" });

        const user = await db.collection('users').findOne({ email: email.toLowerCase() });
        if (user) return res.send([user]);
        res.send([]);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
    }
});

// POST new user
app.post('/users', async (req, res) => {
    try {
        const newUser = req.body;

        // lowercase email for consistency
        newUser.email = newUser.email.toLowerCase();

        // Check if user already exists
        const existingUser = await db.collection('users').findOne({ email: newUser.email });
        if (existingUser) return res.status(409).send({ message: "User already exists" });

        const result = await db.collection('users').insertOne(newUser);
        res.send(result);
    } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Server error" });
    }
});

    // GET all users
    app.get('/users', async (req, res) => {
      const users = await db.collection('users').find().toArray();
      res.send(users);
    });

    // GET single user by ID
    app.get('/users/:id', async (req, res) => {
      const id = req.params.id;
      const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
      if (!user) return res.status(404).send({ message: 'User not found' });
      res.send(user);
    });

    // CREATE new user
    app.post('/users', async (req, res) => {
      const newUser = req.body;
      const result = await db.collection('users').insertOne(newUser);
      res.send(result);
    });

    // UPDATE user role/status
    app.put('/users/:id', async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body; // e.g., { role: 'manager', status: 'active', suspendFeedback: '...' }
      const result = await db.collection('users').updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.send(result);
    });

    // DELETE user
    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const result = await db.collection('users').deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // POST /login
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await db.collection("users").findOne({ email });

      if (!user) return res.status(401).send({ message: "User not found" });

      // Check suspended
      if (user.status === "suspended") {
        return res
          .status(403)
          .send({ message: `Account suspended: ${user.suspendFeedback}` });
      }

      // Example password check (replace with hashed in production)
      if (password !== user.password) return res.status(401).send({ message: "Incorrect password" });

      res.send({ message: "Login successful", user });
    });

    // order part 

    // GET all orders
    app.get('/orders', async (req, res) => {
      const orders = await db.collection('orders').find().toArray();
      res.send(orders);
    });

    // approved order 
app.get("/orders/approved", async (req, res) => {
  try {
    const orders = await ordersCollection
      .find({ status: "approved" })
      .toArray();

    res.send(orders);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch approved orders" });
  }
});

// pending order 

app.get("/orders/pending", async (req, res) => {
  try {
    const orders = await ordersCollection
      .find({ status: "pending" })
      .toArray();

    res.send(orders);
  } catch (error) {
    res.status(500).send({ message: "Failed to fetch pending orders" });
  }
});


    // GET orders by user
    app.get('/orders/user/:userId', async (req, res) => {
      const userId = req.params.userId;
      const orders = await db.collection('orders').find({ userId }).toArray();
      res.send(orders);
    });
    // GET user by Firebase UID
    app.get("/users/firebase/:uid", async (req, res) => {
      try {
        const { uid } = req.params;
        const user = await db.collection("users").findOne({ firebaseUid: uid });
        if (!user) return res.status(404).send({ message: "User not found" });
        res.send(user); // এখানে role সহ সব data পাঠাবে
      } catch (err) {
        res.status(500).send({ message: "Server error" });
      }
    });

    // GET single order
    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const order = await db.collection('orders').findOne({ _id: new ObjectId(id) });
      res.send(order);
    });
    // Optional: /products/orders/:id route
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


    // CREATE new order
    app.post('/orders', async (req, res) => {
      const newOrder = req.body;
      newOrder.status = 'pending';
      newOrder.tracking = [];
      const result = await db.collection('orders').insertOne(newOrder);
      res.send(result);
    });

    // UPDATE order status (approve/reject)
    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const { status, approvedAt } = req.body;
      const result = await db.collection('orders').updateOne(
        { _id: new ObjectId(id) },
        { $set: { status, approvedAt: approvedAt || null } }
      );
      res.send(result);
    });

    // ADD tracking update
    app.put('/orders/tracking/:id', async (req, res) => {
      const id = req.params.id;
      const trackingUpdate = req.body; // { status, location, note, date }
      const result = await db.collection('orders').updateOne(
        { _id: new ObjectId(id) },
        { $push: { tracking: trackingUpdate } }
      );
      res.send(result);
    });

    // DELETE order
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const result = await db.collection('orders').deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });



  } finally {
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send('Server is running...'));
app.listen(port, () => console.log(`Server running on port ${port}`));
