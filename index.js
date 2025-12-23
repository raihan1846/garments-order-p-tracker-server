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