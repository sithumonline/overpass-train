import express from "express";
import joi from "joi";
import trainData from "./train-data.json" assert { type: "json" };
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";

const trainIds = trainData.map((train) =>
  train.trainNumber.toUpperCase().replace(/\s/g, "_")
);

const trainIdSchema = joi.string().valid(...trainIds);
const trainSchema = joi.object({
  trainId: trainIdSchema.required(),
  deviceId: joi.string().required(),
  timestamp: joi.date().required(),
  latitude: joi.number().required(),
  longitude: joi.number().required(),
  distance: joi.number().required(),
  angle: joi.number().required(),
});

try {
  await mongoose.connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/trains",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  );
} catch (error) {
  console.error("Error connecting to the database", error);
  process.exit(1);
}

const Train = mongoose.model("Train", {
  trainId: String,
  deviceId: String,
  timestamp: Date,
  distance: Number,
  angle: Number,
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
});

const app = express();
const port = process.env.PORT || 3000;

const serviceRouter = express.Router();

serviceRouter.get("/trains/:trainId", async (req, res) => {
  const { error } = trainIdSchema.validate(req.params.trainId);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  try {
    const trains = await Train.find({ trainId: req.params.trainId })
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({ message: "Success", data: trains, error: "" });
  } catch (error) {
    console.error("Error fetching train", error);
    res
      .status(500)
      .json({ message: "Error", error: "Error fetching train", data: [] });
  }
});

serviceRouter.post("/trains", async (req, res) => {
  const { error } = trainSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.message });
  }

  const { trainId, deviceId, timestamp, latitude, longitude, distance, angle } =
    req.body;
  const train = new Train({
    trainId,
    deviceId,
    timestamp,
    distance,
    angle,
    location: {
      type: "Point",
      coordinates: [longitude, latitude],
    },
  });

  try {
    await train.save();
    res.json({ message: "Success", data: train.id, error: "" });
  } catch (error) {
    console.error("Error saving train", error);
    res
      .status(500)
      .json({ message: "Error", error: "Error saving train", data: "" });
  }
});

app.use(cors());
app.use(bodyParser.json());
app.use("/api/v1", serviceRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
