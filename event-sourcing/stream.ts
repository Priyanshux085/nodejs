import { Readable, Writable } from "stream";

// const stream = new Readable({
//   // Set the encoding to 'utf8' to receive string data instead of Buffer objects
//   encoding: "utf8",
//   highWaterMark: 2, // Set the highWaterMark to 1KB to control the buffer size
//   // Explain in hinglish:
//   // highWaterMark is a property that determines the maximum amount of data (in bytes)
//   // that can be stored in the internal buffer before it stops accepting more data.
//   //  In this case, we set it to 2 bytes, which means the stream will only accept 2 bytes of data at a time before it needs to be consumed. This helps manage memory usage and ensures that the stream doesn't get overwhelmed with too much data at once.
//   read() {},
// });

// stream.on("data", (chunk) => {
//   const chunkString = chunk.toString();
//   console.log(`Received chunk: ${chunkString} \n`);
// });

// stream.push("Hello, World!");

const writableStream = new Writable({
  write(s) {
    s.enCoding = ""; // Set the encoding to 'utf8' to receive string data instead of Buffer objects

    console.log("Received data: ", s); // This will log the data as a Buffer object
    // because the default encoding for Writable streams is 'utf8', and we haven't specified a different encoding in the options.
    console.log(`Received data: ${s}`); // This will log the data as a string, since the default encoding is 'utf8'
    // because we haven't specified a different encoding in the Writable stream options.
  },
});

writableStream.write("Hello");
