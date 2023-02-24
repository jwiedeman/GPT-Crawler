const puppeteer = require('puppeteer');
const { mongoose } = require('mongoose');
const mongoUri = 'mongodb://127.0.0.1:27017/test';
mongoose.set('strictQuery', false);
const startLink = 'https://en.wikipedia.org/wiki/Wikipedia:Contents/A%E2%80%93Z_index';
const maxLinks = 1000;

let linkCount = 0;
let domainCount = 0;

const Links = mongoose.model('links', {
  url: String,
  visited: Boolean
});

const Domains = mongoose.model('domains', {
  hostname: String,
  visited: Boolean
});
const RESET = "\x1b[0m";
const RED_BACKGROUND = "\x1b[41m";
const WHITE_TEXT = "\x1b[37m";





async function crawl(url) {
  try {
    console.log("%c Crawling " + url + "...", "background-color: black; color: white");



    let link = await Links.findOne({ url });
    if (!link) {
      link = await Links.create({ url, visited: false });
    } else if (link.visited) {
      return;
    }

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    })
  

    const links = await page.$$eval('a', nodes => nodes.map(node => {
      const href = node.href || '';
      const attributes = Object.values(node.attributes);
      const attributeHrefs = attributes.map(attr => attr.value).filter(attrHref => attrHref.match(/^https?:\/\//i));
      const allHrefs = [href, ...attributeHrefs];
      return allHrefs.filter(href => href);
    }).flat());
    for (let i = 0; i < links.length; i++) {
      const href = links[i];
      const hostname = new URL(href).hostname;

      const domaincheck = await Domains.findOne({ hostname });
      if (!domaincheck) {
        console.log(`${RED_BACKGROUND}${WHITE_TEXT}Domain found!  ${hostname} ${RESET}`);
      }
    

      
      const domainPromise = Domains.findOneAndUpdate(
        { hostname },
        { $setOnInsert: { visited: false } },
        { upsert: true }
      );
    
      const [ domain] = await Promise.all([ domainPromise]);
      }
   
    await browser.close();
  } catch (error) {
    //console.error(error);
  }
}


async function run() {
  try {
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    let link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
    let domain = await Domains.findOneAndUpdate({ visited: false }, { $set: { visited: true } });

    if (!link && !domain) {
      const startLinkExists = await Links.exists({ url: startLink });
      if (!startLinkExists) {
        console.log(`Adding start link to database: ${startLink}`);
        await Links.create({ url: startLink, visited: false });
      }
      await crawl(startLink);
    }

    while (true) {
      let visited = false;

      // Visit unvisited domains first
      if (domain) {
        const url = `https://${domain.hostname}`;
        await crawl(url);
        domain = await Domains.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
        visited = true;
      }

      // Visit unvisited links if no unvisited domains are found
      if (link && !visited) {
        await crawl(link.url);
        link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
        visited = true;
      }

      // Visit start link if no unvisited domains or links are found
      if (!visited) {
        const startLinkExists = await Links.exists({ url: startLink });
        if (startLinkExists) {
          await crawl(startLink);
        } else {
          console.log(`Adding start link to database: ${startLink}`);
          await Links.create({ url: startLink, visited: false });
        }
        link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
      }
    }

    console.log(`Crawled ${linkCount} links and found ${domainCount} unique domains`);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
  }
}







run();
