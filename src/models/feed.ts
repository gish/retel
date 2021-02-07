import { Sequelize, DataTypes, Model } from "sequelize";

interface FeedProps {
  url: string;
  latestAdd: number;
  tags: string;
}

interface FeedInstance extends Model<FeedProps>, FeedProps {}
const Feed = (sequelize: Sequelize) =>
  sequelize.define<FeedInstance>("Feed", {
    url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    latestAdd: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "",
    },
  });

export default Feed;
