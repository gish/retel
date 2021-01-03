import { Sequelize, DataTypes, Model } from "sequelize";

interface FeedProps {
  url: string;
  lastRefresh: string;
}

interface FeedInstance extends Model<FeedProps>, FeedProps {}
const Feed = (sequelize: Sequelize) =>
  sequelize.define<FeedInstance>("Feed", {
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lastRefresh: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

export default Feed;
