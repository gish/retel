import axios from "axios";
import Parser from "rss-parser";
import { Sequelize } from "sequelize";
import feed from "./models/feed";
import getEnv from "./utils/get-env";

require("dotenv").config();
const API_BASE_URL = getEnv<string>("API_BASE_URL");
const AUTH_ACCESS_TOKEN = getEnv<string>("AUTH_ACCESS_TOKEN");
const AUTH_CONSUMER_KEY = getEnv<string>("AUTH_CONSUMER_KEY");
const PINTIFIER_KEY = getEnv<string>("PINTIFIER_KEY");
const MYSQL_HOST = getEnv<string>("MYSQL_HOST");
const MYSQL_PORT = getEnv<string>("MYSQL_PORT");
const MYSQL_DATABASE = getEnv<string>("MYSQL_DATABASE");
const MYSQL_USERNAME = getEnv<string>("MYSQL_USERNAME");
const MYSQL_PASSWORD = getEnv(<string>"MYSQL_PASSWORD");
const CLEARDB_DATABASE_URL = getEnv<string>("CLEARDB_DATABASE_URL");
const ENV = getEnv<string>("NODE_ENV", { defaultValue: "development" });
const DEBUG = getEnv<boolean>("DEBUG", {
  defaultValue: "false",
  modifier: (value: string) => value === "true",
});

const logger = (debug: boolean) => (...message: any[]) =>
  debug && console.log(...message);
const log = logger(DEBUG);

const dbUri = CLEARDB_DATABASE_URL.length
  ? CLEARDB_DATABASE_URL
  : `mysql://${MYSQL_USERNAME}:${MYSQL_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/${MYSQL_DATABASE}`;
const sequelizeConnector = new Sequelize(dbUri, {
  logging: ENV !== "production" && console.log,
});

const Feed = feed(sequelizeConnector);
sequelizeConnector.sync();

const getNewItemsFromFeed = async (url: string, refreshDate: Date) => {
  const parser = new Parser();
  const feed = await parser.parseURL(url);
  return feed.items.filter((item: Parser.Item) => {
    const publishDate = new Date(item.isoDate ?? 0);
    log("checking", item.link, item.isoDate, refreshDate);
    return publishDate.getTime() >= refreshDate.getTime();
  });
};

const addFeedItemToList = (tags: string) => (item: Parser.Item) => {
  if (!item.link) {
    log(`Could not add ${item.title}`);
    return new Promise((resolve) => resolve(false));
  }
  log(`Adding ${item.link}`);
  logAddToSlack(item.link);
  return axios({
    method: "post",
    url: `${API_BASE_URL}/add`,
    data: {
      access_token: AUTH_ACCESS_TOKEN,
      consumer_key: AUTH_CONSUMER_KEY,
      tags: `retel,${tags}`,
      url: item.link,
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
        const items = await getNewItemsFromFeed(
          feed.url,
          new Date(feed.lastRefresh)
        );
        log(
          "will add",
          items.map((item) => item.title)
        );
        await Promise.all(items.map(addFeedItemToList(feed.tags)));
        feed.update({ lastRefresh: Sequelize.fn("NOW") });
      })
    );
  } catch (e) {
    console.log(JSON.stringify(e, null, 2));
  }
};

run();
