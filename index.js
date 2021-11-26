const express = require('express')
const app = express()
const port = process.env.PORT || 5000
const cors = require('cors')
require('dotenv').config()
const mongoObjId = require('mongodb').ObjectId

const { MongoClient } = require('mongodb');

// mongo db connection *******************************
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.v21cd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
app.use(cors());
app.use(express.json());


// firebase auth starts ***************************
var admin = require("firebase-admin");
var serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
// firebase auth end ****************************************


// verify jwt token *****************************************
async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch (error) {
      
    }
  }
  next();
}

// rest api implement *******************************
async function run(){
    try{
        await client.connect();
        const database = client.db('cycle_junction');
        const productsCollection = database.collection('porducts');
        const usersCollection = database.collection('users');
        const orderCollection = database.collection('orders');
        const reviewsCollection = database.collection('reviews');

        // PRODUCTS AREA begins ******************************************
        // get all products
        app.get('/products/:limit', async (req, res) => {
          const limit = Number(req.params.limit);
          const cursor = productsCollection.find({}).limit(limit);
          const results = await cursor.toArray();
          res.json(results);
        });

        // insert single product
        app.post('/products', async(req, res) => {
          const product = req.body;
          const result = await productsCollection.insertOne(product);
          res.json(result)
        })
        // PRODUCTS AREA ends******************************************
        

        // order area begins *****************************************
        // insert single product
        app.post('/order', async(req, res) => {
          const product = req.body;
          const result = await orderCollection.insertOne(product);
          res.json(result)
        })
        // get all order
        app.get('/order', async (req, res) => {
          const cursor = orderCollection.find({});
          const results = await cursor.toArray();
          res.json(results);
        });

        // get all order by customer
        app.get('/order/:email', async (req, res) => {
          const email = req.params.email;
            const query = {email: email}
          const cursor = orderCollection.find(query);
          const results = await cursor.toArray();
          res.json(results);
        });

        // update order status
        app.put('/order/:id', async(req, res) =>{
            const id = req.params.id;
            // const updatedUser = req.body;
            const filter = {_id: mongoObjId(id)}
            const options = {upsert: true}
            const updateDoc = {
                $set:{
                    status: 'Shipped'
                }
            }
            const result = await orderCollection.updateOne(filter, updateDoc, options)
            res.json(result)
        })
        
        // delete order ******************************
        app.delete('/order/:id', async(req, res)=>{
            const id = req.params.id;
            const query = {_id: mongoObjId(id)}
            const result = await orderCollection.deleteOne(query)
            res.json(result)
        })
        // order area ends ********************************************


        // review area begins *****************************************
        // insert reviw
        app.post('/review', async(req, res) => {
          const review = req.body;
          console.log(review)
          const result = await reviewsCollection.insertOne(review);
          res.json(result)
        })

        // get all reviews
        app.get('/reviews', async (req, res) => {
          const cursor = reviewsCollection.find({});
          const results = await cursor.toArray();
          res.json(results);
        });
        // review area ends *****************************************

        // user area begins ********************************************
        // register user
        app.post('/users', async(req, res) => {
          const users = req.body;
          const result = await usersCollection.insertOne(users);
          res.json(result)
        })

        app.put('/users', async(req, res) => {
          const users = req.body;
          const filter = {email: users.email}
          const options = {upsert: true}
          const updateDoc = {$set: users};
          const result = await usersCollection.updateOne(filter, updateDoc, options);
          res.json('put response',result);
        })

        // check if a user is admin or not ***********************
        app.get('/users/:email', async(req, res) =>{
          const email = req.params.email;
          const query = {email};
          const user = await usersCollection.findOne(query);
          let isAdmin = false;
          if (user?.role === 'admin') {
            isAdmin = true;
          }
          res.json({admin: isAdmin});
        })

        // set a user as admin **********************
        app.put('/users/admin', verifyToken, async(req, res) =>{
          const useremail = req.body;
          const requesterEmail = req.decodedEmail;
          if (requesterEmail) {
            const requesterAccount = await usersCollection.findOne({email: requesterEmail});
            if (requesterAccount.role === 'admin') {
              const filter = {email: useremail.email}
              const updateDoc = {$set: {role: 'admin'}}
              const result = await usersCollection.updateOne(filter, updateDoc);
            // console.log('result',result)
              res.json(result);
            }
          }
          else{
            res.status(401)
          }
        })
        // user area ends **************************************************
      }
    finally{

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello cycle junction portal!')
  //
})

app.listen(port, () => {
  console.log(`listening at ${port}`)
})