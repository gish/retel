import axios from "axios";
import Parser from "rss-parser";

require("dotenv").config();
const API_BASE_URL = process.env.API_BASE_URL ?? "";
const AUTH_ACCESS_TOKEN = process.env.AUTH_ACCESS_TOKEN ?? "";
const AUTH_CONSUMER_KEY = process.env.AUTH_CONSUMER_KEY ?? "";
const PINTIFIER_KEY = process.env.PINTIFIER_KEY ?? "";
const FEEDS = process.env.FEEDS ?? "";

const isPublishedToday = (item: Parser.Item) => {
  const publishDate = new Date(item.isoDate ?? 0);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return publishDate.getTime() >= oneDayAgo;
};

const getNewItemsFromFeed = async (url: string) => {
  const parser = new Parser();
  const feed = await parser.parseURL(url);
  return feed.items.reduce<string[]>((all, item) => {
    if (!isPublishedToday(item)) {
      return all;
    }
    return item.link ? [...all, item.link] : all;
  }, []);
};
const addUrlToList = (url: string) => {
  console.log(`Adding ${url}`);
  logAddToSlack(url);
  return axios({
    method: "post",
    url: `${API_BASE_URL}/add`,
    data: {
      access_token: AUTH_ACCESS_TOKEN,
      consumer_key: AUTH_CONSUMER_KEY,
      tags: "retel",
      url,
    },
  });
};

const logAddToSlack = async (url: string) => {
  try {
    await axios({
      method: "get",
      url: "https://pintifier.herokuapp.com/api/v1/notification",
      params: {
        key: PINTIFIER_KEY,
        domain: "retel",
        payload: { url },
      },
    });
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
  }
};

const run = async () => {
  try {
    await Promise.all(
      FEEDS.split(",").map(async (feedUrl) => {
        const items = await getNewItemsFromFeed(feedUrl);
        await Promise.all(items.map(addUrlToList));
      })
    );
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
  }
};

run();
