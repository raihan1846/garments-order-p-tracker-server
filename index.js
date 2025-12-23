const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000;

// middleware

app.use(cors());
app.use(express.json());
const uri = "mongodb+srv://garmentsorderproductiontracker:w64Wp9VVTZ0nF6tc@cleancommunity.elxtjut.mongodb.net/?appName=CleanCommunity";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


app.get('/', (req, res) => {
    res.send('server is Running..!!!')
})

// Verify JWT Token Middleware
const verifyJWT = (req, res, next) => {
    const token = req.cookies?.token;
    if (!token) return res.status(401).send({ message: 'Unauthorized access' });
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized access' });
        req.decoded = decoded;
        next();
    });
};

// Verify Admin Middleware
const verifyAdmin = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    if (user?.role !== 'admin') return res.status(403).send({ message: 'Forbidden access' });
    next();
};

// Verify Manager Middleware
const verifyManager = async (req, res, next) => {
    const email = req.decoded.email;
    const query = { email: email };
    const user = await userCollection.findOne(query);
    if (user?.role !== 'manager') return res.status(403).send({ message: 'Forbidden access' });
    next();
};
// Database Collections
let db, productCollection, orderCollection, userCollection, trackingCollection;


async function run(){
try{
     await client.connect();
        db = client.db('garments_order_production');
        productCollection = db.collection('products');
        orderCollection = db.collection('orders');
        userCollection = db.collection('users');
        trackingCollection = db.collection('tracking');

        console.log("✅ Connected to MongoDB");

         // Generate JWT and set cookie
        app.post('/jwt', async (req, res) => {
            const email = req.body.email;
            const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '7d' });
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true });
        });


           // Clear JWT on logout
        app.post('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            }).send({ success: true });
        });

         // Save or update user data (Registration / Social Login)
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(query, updateDoc, options);
            res.send(result);
        });

                // Get user by email (for profile, role check)
        app.get('/users/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (!user) return res.status(404).send({ message: 'User not found' });
            // Don't send password back
            const { password, ...userData } = user;
            res.send(userData);
        });

         app.get('/products/home', async (req, res) => {
            const result = await productCollection.find({ showOnHome: true }).limit(6).toArray();
            res.send(result);
        });


 // Get all products (All Products page) with pagination
        app.get('/products', async (req, res) => {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 9;
            const skip = (page - 1) * limit;
            const search = req.query.search || '';

            let query = {};
            if (search) {
                query = {
                    $or: [
                        { productName: { $regex: search, $options: 'i' } },
                        { category: { $regex: search, $options: 'i' } }
                    ]
                };
            }

            const products = await productCollection.find(query).skip(skip).limit(limit).toArray();
            const total = await productCollection.countDocuments(query);
            res.send({ products, total, page, totalPages: Math.ceil(total / limit) });
        });

// Get single product details
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        });


          // Manager: Add a new product
        app.post('/products', verifyJWT, verifyManager, async (req, res) => {
            const product = req.body;
            product.createdAt = new Date();
            product.createdBy = req.decoded.email;
            const result = await productCollection.insertOne(product);
            res.send(result);
        });
// Manager: Update a product
        app.patch('/products/:id', verifyJWT, verifyManager, async (req, res) => {
            const id = req.params.id;
            const updates = req.body;
            const query = { _id: new ObjectId(id) };
            const updateDoc = { $set: updates };
            const result = await productCollection.updateOne(query, updateDoc);
            res.send(result);
        });
 // Manager/Admin: Delete a product
        app.delete('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            // Verify authorization - only manager who created or admin can delete
            const product = await productCollection.findOne(query);
            const user = await userCollection.findOne({ email: req.decoded.email });
            if (user.role === 'manager' && product.createdBy !== req.decoded.email) {
                return res.status(403).send({ message: 'Not authorized to delete this product' });
            }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        });



          // Buyer: Place a new order
        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            order.orderDate = new Date();
            order.status = 'Pending';
            order.buyerEmail = req.decoded.email;
            // Check product quantity
            const product = await productCollection.findOne({ _id: new ObjectId(order.productId) });
            if (order.quantity > product.availableQuantity) {
                return res.status(400).send({ message: 'Order quantity exceeds available stock' });
            }
            if (order.quantity < product.minimumOrder) {
                return res.status(400).send({ message: `Minimum order quantity is ${product.minimumOrder}` });
            }
            // Calculate total price
            order.totalPrice = order.quantity * product.price;
            const result = await orderCollection.insertOne(order);
            // Decrease product quantity
            await productCollection.updateOne(
                { _id: new ObjectId(order.productId) },
                { $inc: { availableQuantity: -order.quantity } }
            );
            res.send(result);
        });

 // Buyer: Get my orders
        app.get('/orders/my-orders', verifyJWT, async (req, res) => {
            const email = req.decoded.email;
            const orders = await orderCollection.find({ buyerEmail: email }).toArray();
            res.send(orders);
        });

         // Buyer: Cancel order (only if pending)
        app.patch('/orders/:id/cancel', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id), buyerEmail: req.decoded.email };
            const order = await orderCollection.findOne(query);
            if (!order) return res.status(404).send({ message: 'Order not found' });
            if (order.status !== 'Pending') {
                return res.status(400).send({ message: 'Only pending orders can be cancelled' });
            }
            const updateDoc = { $set: { status: 'Cancelled' } };
            // Restore product quantity
            await productCollection.updateOne(
                { _id: new ObjectId(order.productId) },
                { $inc: { availableQuantity: order.quantity } }
            );
            const result = await orderCollection.updateOne(query, updateDoc);
            res.send(result);
        });

// Manager: Get pending orders
        app.get('/orders/pending', verifyJWT, verifyManager, async (req, res) => {
            const orders = await orderCollection.find({ status: 'Pending' }).toArray();
            res.send(orders);
        });

    app.post('/products', async(req,res)=>{
        const newProduct = req.body;
        const result = await productCollection.insertOne(newProduct);
        res.send(result);
    })

    await client.db("admin").command({ping : 1});
    console.log("Ping Database");
}
finally{

}
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server is running, ${port}`);
})