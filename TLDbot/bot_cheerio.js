const cheerio = require('cheerio');
const axios = require('axios');
const mongoose = require('mongoose');
const mongoUri = 'mongodb://127.0.0.1:27017/test';
mongoose.set('strictQuery', false);
const startLink = 'https://en.wikipedia.org/wiki/Wikipedia:Contents/A%E2%80%93Z_index';

let linkCount = 0, domainCount = 0;

const Links = mongoose.model('links', { url: String, visited: Boolean });
const Domains = mongoose.model('domains', { hostname: String, visited: Boolean });

async function crawl(url) {
  console.log(' Scraping Domain : ' + url );
  let link = await Links.findOne({ url });
  if (!link) link = await Links.create({ url, visited: true });
  else if (link.visited) return;

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    // Wait for 2 seconds to allow the page to fully load
    await new Promise(resolve => setTimeout(resolve, 1000));
    const links = $('a')
      .map((i, el) => $(el).attr('href'))
      .get()
      .filter(href => href && href.match(/^https?:\/\//i));

    for (const href of links) {
      const hostname = new URL(href).hostname;
      if (!(await Domains.findOne({ hostname }))) console.log('\x1b[41m\x1b[30m New Domain Found : ' + hostname + ' \x1b[0m');

      await Promise.all([
        Domains.findOneAndUpdate({ hostname }, { $setOnInsert: { visited: false } }, { upsert: true })
      ]);
    }
  } catch (error) {
  }
}



async function run() {
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  let link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
  let domain = await Domains.findOneAndUpdate({ visited: false }, { $set: { visited: true } });

  if (!link && !domain) {
    const startLinkExists = await Links.exists({ url: startLink });
    if (!startLinkExists) await Links.create({ url: startLink, visited: false });
    await crawl(startLink);
  }

  while (true) {
    let visited = false;

    if (domain) {
      const url = `https://${domain.hostname}`;
      await crawl(url);
      domain = await Domains.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
      visited = true;
    }

    if (link && !visited) {
      await crawl(link.url);
      link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
      visited = true;
    }

    if (!visited) {
      const startLinkExists = await Links.exists({ url: startLink });
      if (startLinkExists) await crawl(startLink);
      else await Links.create({ url: startLink, visited: false });
      link = await Links.findOneAndUpdate({ visited: false }, { $set: { visited: true } });
    }
  }
}

run();
