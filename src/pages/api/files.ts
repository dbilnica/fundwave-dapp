import formidable from "formidable";
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";

const pinataSDK = require("@pinata/sdk");
const pinata = new pinataSDK({ pinataJWTKey: process.env.PINATA_JWT });

export const config = {
  api: {
    bodyParser: false,
  },
};

const saveFile = async (file: formidable.File) => {
  try {
    const buffer = fs.readFileSync(file.filepath);
    const fileType = await fileTypeFromBuffer(buffer);
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

    if (!fileType || !validTypes.includes(fileType.mime)) {
      fs.unlinkSync(file.filepath);
      throw new Error("Invalid file type. Only JPG, PNG, and WEBP images are allowed.");
    }

    const stream = fs.createReadStream(file.filepath);
    const options = {
      pinataMetadata: { name: file.originalFilename },
    };

    const response = await pinata.pinFileToIPFS(stream, options);
    fs.unlinkSync(file.filepath);

    return response;
  } catch (error) {
    throw error;
  }
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Upload Error");
      }
      try {
        const response = await saveFile(files.file);
        const { IpfsHash } = response;

        return res.status(200).send(IpfsHash);
      } catch (error) {
        console.error(error);
        return res.status(400).send(error.message);
      }
    });
  } else if (req.method === "GET") {
    try {
      const response = await pinata.pinList({}, { pageLimit: 1 });
      res.json(response.rows[0]);
    } catch (e) {
      console.error(e);
      res.status(500).send("Server Error");
    }
  } else {
    res.setHeader('Allow', ['POST', 'GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
