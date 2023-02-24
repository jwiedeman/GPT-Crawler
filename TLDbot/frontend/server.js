const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
mongoose.set('strictQuery', false);

const app = express();
const port = 3001;
const mongoUri = 'mongodb://127.0.0.1:27017/test';

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

app.use(cors({
  origin: '*'
}));

const Links = mongoose.model('links', {
  url: String,
  visited: Boolean
});

const Domains = mongoose.model('domains', {
  hostname: String,
  visited: Boolean
});

app.get('/api/links', async (req, res) => {
  
  const countLinks = await Links.countDocuments();
  const countDomains = await Domains.countDocuments();
  const countLinksUnvisited = await Links.countDocuments({ visited: false });
  const countDomainsUnvisited = await Domains.countDocuments({ visited: false });
  
  res.send({ totalLinks: countLinks,totalDomains : countDomains , totalUnvisitedLinks : countLinksUnvisited , totalUnvisitedDomains :countDomainsUnvisited  });
});


app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
