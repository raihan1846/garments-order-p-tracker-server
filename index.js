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