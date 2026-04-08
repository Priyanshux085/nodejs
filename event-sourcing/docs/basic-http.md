# Creating a Basic HTTP Server

```js
import http from "http";
// Create an HTTP server
const server = http.createServer((req, res) => {
  // Log the request URL
  console.log(`Received request: ${req.url}`);

  // Set the response header
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Hello World\n");
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
```

## Explanation

1. We import the `http` module, which is built into Node.js, to create an HTTP server.
2. We create a server using `http.createServer()`, which takes a callback function that is called every time a request is made to the server. The callback function receives two arguments: `req` (the request object) and `res` (the response object).

Note: The `req` object contains information about the incoming request, such as the URL, headers, and method. The `res` object is used to send a response back to the client.

### Types of Streams

In Node.js, there are four types of streams:

1. Readable Streams: These streams are used for reading data. Examples include `fs.createReadStream()` and `http.IncomingMessage`.
2. Writable Streams: These streams are used for writing data. Examples include `fs.createWriteStream()` and `http.ServerResponse`.
3. Duplex Streams: These streams are both readable and writable. Examples include `net.Socket` and `tls.TLSSocket`.
4. Transform Streams: These streams are a type of duplex stream that can modify or transform the data as it is read or written. Examples include `zlib.createGzip()` and `zlib.createGunzip()`.

### Handling Requests

In the example above, we handle incoming requests by logging the request URL and sending a simple "Hello World" response. The `res.writeHead()` method is used to set the HTTP status code and headers for the response, while `res.end()` is used to send the response body and end the response.

### Streams in Bun vs Node

- In Node.js, the `http` module uses streams to handle incoming requests and outgoing responses. The `req` object is a readable stream, while the `res` object is a writable stream. This allows for efficient handling of large data and streaming responses.
- In Bun, the `http` module also uses streams, but it provides a more modern and efficient API for handling HTTP requests and responses. The `req` object is a readable stream, and the `res` object is a writable stream, similar to Node.js. However, Bun's implementation is optimized for performance and memory efficiency, making it a great choice for building high-performance HTTP servers.

## Basic Stream Files Code snippet (The Wrong way to do it)

```js
import fs from "fs";
import http from "http";
// Create an HTTP server
const server = http.createServer((req, res) => {
  // Log the request URL
  console.log(`Received request: ${req.url}`);

  if (req.url !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found\n");
    return;
  }

  // Create a readable stream from a file
  const file = fs.readFileSync("example.txt", "utf-8");

  // Set the response header
  res.end(file);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at ${PORT}`);
});
```

```plaintext
example.txt:
Hello, this is a simple text file.
```

### Explanation of the Wrong Way

In the above code snippet, we are using `fs.readFileSync()` to read the contents of `example.txt` synchronously. This means that the server will block and wait for the file to be read before it can handle any other incoming requests. If the file is large or if there are multiple requests coming in at the same time, this can lead to performance issues and a poor user experience.
