import axios from "axios";
import Parser from "rss-parser";
import { Sequelize } from "sequelize";
import feed from "./models/feed";

require("dotenv").config();
const API_BASE_URL = process.env.API_BASE_URL ?? "";
const AUTH_ACCESS_TOKEN = process.env.AUTH_ACCESS_TOKEN ?? "";
const AUTH_CONSUMER_KEY = process.env.AUTH_CONSUMER_KEY ?? "";
const PINTIFIER_KEY = process.env.PINTIFIER_KEY ?? "";
const MYSQL_HOST = process.env.MYSQL_HOST ?? "";
const MYSQL_PORT = process.env.MYSQL_PORT ?? "";
const MYSQL_DATABASE = process.env.MYSQL_DATABASE ?? "";
const MYSQL_USERNAME = process.env.MYSQL_USERNAME ?? "";
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD ?? "";
const CLEARDB_DATABASE_URL = process.env.CLEARDB_DATABASE_URL ?? "";
const ENV = process.env.NODE_ENV ?? "development";

const dbUri = CLEARDB_DATABASE_URL.length
  ? CLEARDB_DATABASE_URL
  : `mysql://${MYSQL_USERNAME}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`;
const sequelizeConnector = new Sequelize(dbUri, {
  logging: ENV !== "production" && console.log,
});

const Feed = feed(sequelizeConnector);
sequelizeConnector.sync();

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
    const feeds = await Feed.findAll();
    await Promise.all(
      feeds.map(async (feed) => {
        const items = await getNewItemsFromFeed(feed.url);
        await Promise.all(items.map(addUrlToList));
        feed.update({ lastRefresh: Sequelize.fn("NOW") });
      })
    );
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
  }
};

run();
