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

async function run(){
try{
    await client.connect();

    const db = client.db('garments_order_productions');
    const productCollection = db.collection('products');

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