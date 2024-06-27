import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import axios from "axios";

dotenv.config();
var app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({ app: "App", stauts: 200 });
});

var OSRouter = express.Router();

OSRouter.get("/", (req, res) => {
  try {
    const filePath = `${__dirname}/data/os.json`;
    const data = fs.readFileSync(filePath, "utf8");
    const dataParse = JSON.parse(data);

    res.status(200).json(dataParse);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

OSRouter.post("/", (req, res) => {
  try {
    const filePath = `${__dirname}/data/os.json`;
    const data = fs.readFileSync(filePath, "utf8");
    const dataParse = JSON.parse(data);

    let oldData = dataParse;

    const isExist = oldData.some((x) => x.name === req.body.name);

    if (isExist) {
      return res.status(400).json({
        status: 400,
        message: "Already Exist OS",
      });
    }

    const newData = { name: req.body.name };

    oldData.push(newData);

    const newDataWrite = JSON.stringify(oldData, null, 2);

    fs.writeFileSync(filePath, newDataWrite);

    console.log(oldData);
    res.status(200).json(newData);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

var DeviceRouter = express.Router();

DeviceRouter.get("/", (req, res) => {
  try {
    const filePath = `${__dirname}/data/devices.json`;
    const data = fs.readFileSync(filePath, "utf8");
    const dataParse = JSON.parse(data);

    res.status(200).json(dataParse);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

DeviceRouter.post("/", (req, res) => {
  try {
    const fileOSPath = `${__dirname}/data/os.json`;
    const dataOS = fs.readFileSync(fileOSPath, "utf8");
    const dataOSParse = JSON.parse(dataOS);

    const isOSExist = dataOSParse.some((x) => x.name === req.body.os);

    if (!isOSExist) {
      return res.status(400).json({
        status: 400,
        message: "OS Not Found",
      });
    }

    const fileDevicePath = `${__dirname}/data/devices.json`;
    const dataDevice = fs.readFileSync(fileDevicePath, "utf8");
    let dataDeviceParse = JSON.parse(dataDevice);

    const isDeviceExist = dataDeviceParse.some((x) => x.ip == req.body.ip);
    if (isDeviceExist) {
      return res.status(400).json({
        status: 400,
        message: "IP Already Exist",
      });
    }

    dataDeviceParse.push({ ...req.body, mac: [] });

    const newDataWrite = JSON.stringify(dataDeviceParse, null, 2);

    fs.writeFileSync(fileDevicePath, newDataWrite);

    res.status(201).json(req.body);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

DeviceRouter.post("/mac", async (req, res) => {
  try {
    const os = req.body.os;
    const mac = req.body.mac;
    const fileDevicePath = `${__dirname}/data/devices.json`;
    const dataDevice = fs.readFileSync(fileDevicePath, "utf8");
    let dataDeviceParse = JSON.parse(dataDevice);

    dataDeviceParse.forEach(async (x) => {
      if (x.os == os) {
        const find = x.mac.some((y) => y == mac);
        if (!find) {
          x.mac.push(mac);
          await addMac(x.ip, x.portIventoy, mac);
        }
      }
    });

    fs.writeFileSync(fileDevicePath, JSON.stringify(dataDeviceParse, null, 2));

    res.status(200).json(dataDeviceParse);
  } catch (err) {
    console.log(error);
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

DeviceRouter.delete("/mac", async (req, res) => {
  try {
    const os = req.body.os;
    const mac = req.body.mac;

    const fileDevicePath = `${__dirname}/data/devices.json`;
    const dataDevice = fs.readFileSync(fileDevicePath, "utf8");
    const dataDeviceParse = JSON.parse(dataDevice);

    dataDeviceParse.forEach(async device => {
        if (device.os == os) {
            const index = device.mac.indexOf(mac);
            if (index > -1) {
                device.mac.splice(index, 1);
            }
            await delMac(device.ip, device.portIventoy, mac);
        }
    });

    fs.writeFileSync(fileDevicePath, JSON.stringify(dataDeviceParse, null, 2));

    res.status(200).json(dataDeviceParse);
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Internal Server Error",
    });
  }
});

async function addMac(ip, port, mac) {
  try {
    const filterMac = await axios
      .post(`http://${ip}:${port}/iventoy/json`, {
        method: "get_mac_filter",
      })
      .then((response) => {
        return response.data;
      });

    if (filterMac.mode == "deny") {
      await axios
        .post(`http://${ip}:${port}/iventoy/json`, {
          method: "set_mac_filter_mode",
          mode: "access",
        })
        .then((response) => {
          console.log("Set Mac Filter Mode", response.data);
        });
    }

    const findExistMac = filterMac.list.some((x) => x == mac);

    if (!findExistMac) {
      await axios
        .post(`http://${ip}:${port}/iventoy/json`, {
          method: "add_filter_mac",
          mac: mac,
        })
        .then((response) => {
          return response.data;
        });
    }

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

async function delMac(ip, port, mac) {
    await axios.post(`http://${ip}:${port}/iventoy/json`, {
        method: "del_filter_mac",
        mac: mac
    }).then(response => {
        console.log('Del Mac' ,response.data)
    });
}

app.use("/os", OSRouter);
app.use("/devices", DeviceRouter);

app.listen(3000, function () {
  console.log("Example app listening on port 3000!");
});
