import fs from "fs";
import http from "http";

const PORT = 3000;

const server = http.createServer((req, res) => {
  const readStream = fs.createReadStream("sample.txt");
  const outputStream = fs.createWriteStream("output.txt");

  readStream.on("data", (chunk) => {
    console.log(`Received chunk: ${chunk.toString()} \n`); // Log the received chunk as a string

    const newChunk = chunk.toString().toUpperCase(); // Convert the chunk to uppercase
    const finalString = newChunk
      .replaceAll(" ", "") // Replace empty strings with "A"
      // .replaceAll(/ADFASDF/g, "Bhai")
      .replaceAll(/ /g, "_"); // Replace spaces with underscores

    outputStream.write(finalString); // Write the modified chunk to the output stream
  });

  res.emit("pipe", readStream, outputStream);
});

server.listen(PORT, () => {
  console.log(`Server running at PORT ${PORT}`);
});
